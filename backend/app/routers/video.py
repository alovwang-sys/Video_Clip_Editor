import os
import uuid
import aiofiles
import logging
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from typing import Dict

from app.models.schemas import (
    VideoUploadResponse,
    VideoStatusResponse,
    VideoInfo,
    VideoStatus,
    AnalyzeRequest
)
from app.config import settings
from app.services.oss_client import OSSClient
from app.services.llm_client import ZhipuVideoAnalyzer
from app.services.video_processor import VideoProcessor
from app.services.video_analyzer import VideoAnalyzer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/videos", tags=["videos"])

# 内存存储（生产环境应使用数据库）
video_store: Dict[str, VideoInfo] = {}

# 初始化服务
oss_client = None
llm_client = None
video_processor = VideoProcessor()
video_analyzer = None


def get_oss_client():
    global oss_client
    if oss_client is None and settings.OSS_ACCESS_KEY_ID:
        oss_client = OSSClient(
            access_key_id=settings.OSS_ACCESS_KEY_ID,
            access_key_secret=settings.OSS_ACCESS_KEY_SECRET,
            endpoint=settings.OSS_ENDPOINT,
            bucket_name=settings.OSS_BUCKET_NAME
        )
    return oss_client


def get_llm_client():
    global llm_client
    if llm_client is None and settings.ZHIPU_API_KEY:
        llm_client = ZhipuVideoAnalyzer(
            api_key=settings.ZHIPU_API_KEY,
            model=settings.ZHIPU_MODEL
        )
    return llm_client


def get_video_analyzer():
    global video_analyzer
    if video_analyzer is None:
        oss = get_oss_client()
        llm = get_llm_client()
        if oss and llm:
            video_analyzer = VideoAnalyzer(llm, oss, video_processor)
    return video_analyzer


@router.post("/upload", response_model=VideoUploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None
):
    """上传视频文件（超过5分钟自动切分）"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # 检查文件类型
    allowed_extensions = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type. Allowed: {allowed_extensions}"
        )

    # 生成唯一ID
    video_id = uuid.uuid4().hex

    # 保存文件
    file_path = str(Path(settings.UPLOAD_DIR) / f"{video_id}{ext}")

    try:
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
    except Exception as e:
        logger.error(f"Error saving file: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file")

    # 获取视频信息
    video_info_dict = video_processor.get_video_info(file_path)
    duration = video_info_dict.get('duration', 0)

    # 创建原始视频信息
    video_info = VideoInfo(
        video_id=video_id,
        filename=file.filename,
        file_path=file_path,
        status=VideoStatus.UPLOADED,
        duration=duration,
        width=video_info_dict.get('width'),
        height=video_info_dict.get('height'),
        fps=video_info_dict.get('fps'),
        is_segment=False
    )

    video_store[video_id] = video_info

    # 如果视频超过5分钟，自动切分
    SEGMENT_THRESHOLD = 300  # 5分钟
    if duration > SEGMENT_THRESHOLD:
        logger.info(f"Video duration {duration}s > {SEGMENT_THRESHOLD}s, splitting into segments")

        def split_video_task():
            segments = video_processor.split_video(file_path, segment_duration=SEGMENT_THRESHOLD)

            for seg in segments:
                seg_id = uuid.uuid4().hex
                seg_info_dict = video_processor.get_video_info(seg["path"])

                # 格式化时间显示
                start_min = int(seg["start"] // 60)
                start_sec = int(seg["start"] % 60)
                end_min = int(seg["end"] // 60)
                end_sec = int(seg["end"] % 60)

                seg_info = VideoInfo(
                    video_id=seg_id,
                    filename=f"{Path(file.filename).stem}_片段{seg['index']+1} ({start_min:02d}:{start_sec:02d}-{end_min:02d}:{end_sec:02d}){ext}",
                    file_path=seg["path"],
                    status=VideoStatus.UPLOADED,
                    duration=seg["duration"],
                    width=seg_info_dict.get('width'),
                    height=seg_info_dict.get('height'),
                    fps=seg_info_dict.get('fps'),
                    parent_video_id=video_id,
                    segment_index=seg["index"],
                    segment_start=seg["start"],
                    segment_end=seg["end"],
                    is_segment=True
                )
                video_store[seg_id] = seg_info
                logger.info(f"Created segment: {seg_id} ({seg['index']+1})")

        background_tasks.add_task(split_video_task)

    return VideoUploadResponse(
        video_id=video_id,
        filename=file.filename,
        status=VideoStatus.UPLOADED,
        message=f"Video uploaded successfully. Duration: {duration:.1f}s" +
                (f", splitting into {int(duration // SEGMENT_THRESHOLD) + 1} segments..." if duration > SEGMENT_THRESHOLD else "")
    )


@router.get("/{video_id}/status", response_model=VideoStatusResponse)
async def get_video_status(video_id: str):
    """获取视频处理状态"""
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video not found")

    video = video_store[video_id]

    return VideoStatusResponse(
        video_id=video_id,
        status=video.status,
        progress=100 if video.status == VideoStatus.ANALYZED else 0,
        message=f"Status: {video.status.value}",
        duration=video.duration
    )


@router.post("/{video_id}/analyze")
async def analyze_video(
    video_id: str,
    request: AnalyzeRequest = None,
    background_tasks: BackgroundTasks = None
):
    """分析视频，识别精彩片段（后台任务）"""
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video not found")

    video = video_store[video_id]

    # 如果已经在分析中，返回当前状态
    if video.status == VideoStatus.ANALYZING:
        return {
            "video_id": video_id,
            "status": "analyzing",
            "message": "Video analysis is in progress. Please poll /api/videos/{video_id}/status for updates."
        }

    analyzer = get_video_analyzer()

    if analyzer is None:
        raise HTTPException(
            status_code=500,
            detail="Video analyzer not configured. Check API keys."
        )

    # 更新状态为分析中
    video.status = VideoStatus.ANALYZING

    # 在后台执行分析任务
    async def run_analysis():
        try:
            prompt = request.prompt if request else None
            logger.info(f"Starting background analysis for video: {video_id}")
            clips = await analyzer.analyze_video(video, prompt)
            video.clips = clips
            video.status = VideoStatus.ANALYZED
            logger.info(f"Analysis completed for video: {video_id}, found {len(clips)} clips")
        except Exception as e:
            video.status = VideoStatus.ERROR
            video.error_message = str(e)
            logger.error(f"Error analyzing video {video_id}: {e}")

    background_tasks.add_task(run_analysis)

    return {
        "video_id": video_id,
        "status": "analyzing",
        "message": "Video analysis started. Poll /api/videos/{video_id}/status for updates."
    }


@router.get("/{video_id}/info")
async def get_video_info(video_id: str):
    """获取视频详细信息"""
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video not found")

    video = video_store[video_id]

    return {
        "video_id": video.video_id,
        "filename": video.filename,
        "status": video.status,
        "duration": video.duration,
        "width": video.width,
        "height": video.height,
        "fps": video.fps
    }


@router.get("/{video_id}/stream")
async def stream_video(video_id: str):
    """流式传输视频"""
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video not found")

    video = video_store[video_id]

    if not os.path.exists(video.file_path):
        raise HTTPException(status_code=404, detail="Video file not found")

    return FileResponse(
        video.file_path,
        media_type="video/mp4",
        filename=video.filename
    )


@router.get("", response_model=list)
async def list_videos():
    """获取所有视频列表"""
    return [
        {
            "video_id": v.video_id,
            "filename": v.filename,
            "status": v.status,
            "duration": v.duration,
            "width": v.width,
            "height": v.height,
            "fps": v.fps,
            "is_segment": v.is_segment,
            "parent_video_id": v.parent_video_id,
            "segment_index": v.segment_index,
            "segment_start": v.segment_start,
            "segment_end": v.segment_end
        }
        for v in video_store.values()
    ]
