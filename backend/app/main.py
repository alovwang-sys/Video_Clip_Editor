import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.routers import video, clips
from app.config import settings

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


def restore_videos_from_uploads():
    """启动时从 uploads 和 segments 目录恢复视频记录"""
    from app.routers.video import video_store, video_processor
    from app.models.schemas import VideoInfo, VideoStatus

    uploads_dir = Path(settings.UPLOAD_DIR)
    segments_dir = Path(settings.OUTPUT_DIR) / "segments"

    video_extensions = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}

    # 恢复原视频
    if uploads_dir.exists():
        for file_path in uploads_dir.iterdir():
            if file_path.suffix.lower() in video_extensions:
                video_id = file_path.stem
                if video_id not in video_store:
                    try:
                        video_info_dict = video_processor.get_video_info(str(file_path))
                        video_info = VideoInfo(
                            video_id=video_id,
                            filename=file_path.name,
                            file_path=str(file_path),
                            status=VideoStatus.UPLOADED,
                            duration=video_info_dict.get('duration'),
                            width=video_info_dict.get('width'),
                            height=video_info_dict.get('height'),
                            fps=video_info_dict.get('fps'),
                            is_segment=False
                        )
                        video_store[video_id] = video_info
                        logger.info(f"Restored video: {video_id}")
                    except Exception as e:
                        logger.error(f"Failed to restore video {file_path}: {e}")

    # 恢复视频片段
    if segments_dir.exists():
        # 按文件名排序，确保片段顺序正确
        segment_files = sorted(
            [f for f in segments_dir.iterdir() if f.suffix.lower() in video_extensions],
            key=lambda x: int(x.name.split('_')[1]) if '_' in x.name else 0
        )

        for file_path in segment_files:
            try:
                # 从文件名解析片段信息: segment_0_abc123.mp4
                parts = file_path.stem.split('_')
                if len(parts) >= 2 and parts[0] == 'segment':
                    seg_index = int(parts[1])
                    seg_id = parts[2] if len(parts) > 2 else file_path.stem

                    if seg_id in video_store:
                        continue

                    video_info_dict = video_processor.get_video_info(str(file_path))
                    duration = video_info_dict.get('duration', 300)

                    # 计算时间范围
                    seg_start = seg_index * 300
                    seg_end = seg_start + duration

                    # 格式化时间
                    start_min = int(seg_start // 60)
                    start_sec = int(seg_start % 60)
                    end_min = int(seg_end // 60)
                    end_sec = int(seg_end % 60)

                    # 查找父视频（第一个非分段视频）
                    parent_id = None
                    for v in video_store.values():
                        if not v.is_segment:
                            parent_id = v.video_id
                            break

                    video_info = VideoInfo(
                        video_id=seg_id,
                        filename=f"视频_片段{seg_index+1} ({start_min:02d}:{start_sec:02d}-{end_min:02d}:{end_sec:02d}).mp4",
                        file_path=str(file_path),
                        status=VideoStatus.UPLOADED,
                        duration=duration,
                        width=video_info_dict.get('width'),
                        height=video_info_dict.get('height'),
                        fps=video_info_dict.get('fps'),
                        parent_video_id=parent_id,
                        segment_index=seg_index,
                        segment_start=seg_start,
                        segment_end=seg_end,
                        is_segment=True
                    )
                    video_store[seg_id] = video_info
                    logger.info(f"Restored segment: {seg_id} (index={seg_index})")
            except Exception as e:
                logger.error(f"Failed to restore segment {file_path}: {e}")

    logger.info(f"Restored {len(video_store)} videos from uploads/segments directory")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用生命周期管理"""
    # 启动时恢复视频记录
    restore_videos_from_uploads()
    yield
    # 关闭时清理（如需要）


app = FastAPI(
    title="视频精彩片段识别与自动剪辑系统",
    description="智能视频处理系统，支持上传视频、通过多模态LLM识别精彩片段、自动剪辑并导出MP4",
    version="1.0.0",
    lifespan=lifespan
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(video.router)
app.include_router(clips.router)

# 静态文件服务
uploads_path = Path(settings.UPLOAD_DIR)
outputs_path = Path(settings.OUTPUT_DIR)

uploads_path.mkdir(parents=True, exist_ok=True)
outputs_path.mkdir(parents=True, exist_ok=True)

app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")
app.mount("/outputs", StaticFiles(directory=str(outputs_path)), name="outputs")


@app.get("/")
async def root():
    return {
        "message": "视频精彩片段识别与自动剪辑系统 API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=True
    )
