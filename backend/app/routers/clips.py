import os
import uuid
import logging
from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from typing import List

from app.models.schemas import (
    ClipsResponse,
    ClipInfo,
    ExportRequest,
    ExportResponse
)
from app.routers.video import video_store, video_processor, get_oss_client
from app.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/clips", tags=["clips"])

# 导出任务存储
export_store = {}


@router.get("/{video_id}", response_model=ClipsResponse)
async def get_clips(video_id: str):
    """获取视频的精彩片段列表"""
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video not found")

    video = video_store[video_id]

    return ClipsResponse(
        video_id=video_id,
        clips=video.clips,
        total_count=len(video.clips)
    )


@router.put("/{video_id}/{clip_id}/select")
async def toggle_clip_selection(video_id: str, clip_id: str, selected: bool = True):
    """切换片段选中状态"""
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video not found")

    video = video_store[video_id]

    for clip in video.clips:
        if clip.id == clip_id:
            clip.selected = selected
            return {"message": f"Clip {clip_id} selection updated", "selected": selected}

    raise HTTPException(status_code=404, detail="Clip not found")


@router.get("/{clip_id}/preview")
async def preview_clip(clip_id: str):
    """预览单个片段"""
    # 查找片段所属的视频
    for video in video_store.values():
        for clip in video.clips:
            if clip.id == clip_id:
                # 生成预览视频
                preview_path = video_processor.generate_preview(
                    video.file_path,
                    clip.start_seconds,
                    clip.end_seconds - clip.start_seconds
                )
                return FileResponse(
                    preview_path,
                    media_type="video/mp4",
                    filename=f"preview_{clip_id}.mp4"
                )

    raise HTTPException(status_code=404, detail="Clip not found")


@router.get("/{clip_id}/thumbnail")
async def get_thumbnail(clip_id: str):
    """获取片段缩略图"""
    for video in video_store.values():
        for clip in video.clips:
            if clip.id == clip_id:
                if clip.thumbnail_url:
                    # 如果有OSS URL，返回重定向
                    return {"thumbnail_url": clip.thumbnail_url}

                # 否则尝试从本地获取
                thumbnail_path = (
                    Path(settings.OUTPUT_DIR) /
                    "thumbnails" /
                    video.video_id /
                    f"{clip_id}.jpg"
                )
                if thumbnail_path.exists():
                    return FileResponse(
                        str(thumbnail_path),
                        media_type="image/jpeg"
                    )

    raise HTTPException(status_code=404, detail="Thumbnail not found")


@router.post("/{video_id}/export", response_model=ExportResponse)
async def export_clips(video_id: str, request: ExportRequest):
    """导出选中的片段"""
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video not found")

    video = video_store[video_id]

    # 获取选中的片段
    selected_clips = [
        clip for clip in video.clips
        if clip.id in request.clip_ids
    ]

    if not selected_clips:
        raise HTTPException(status_code=400, detail="No clips selected")

    export_id = uuid.uuid4().hex

    try:
        # 准备片段时间列表
        clips_times = [
            (clip.start_seconds, clip.end_seconds)
            for clip in selected_clips
        ]

        # 导出片段
        output_path = video_processor.export_clips(
            video.file_path,
            clips_times,
            merge=request.merge,
            resolution=request.resolution
        )

        # 上传到OSS（如果配置了）
        download_url = None
        oss = get_oss_client()
        if oss and os.path.exists(output_path):
            download_url = oss.upload_file(output_path)
        else:
            # 本地下载链接
            download_url = f"/api/clips/download/{export_id}"

        export_store[export_id] = {
            "video_id": video_id,
            "output_path": output_path,
            "download_url": download_url
        }

        return ExportResponse(
            export_id=export_id,
            video_id=video_id,
            status="completed",
            download_url=download_url,
            message="Export completed successfully"
        )

    except Exception as e:
        logger.error(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{export_id}")
async def download_export(export_id: str):
    """下载导出的视频"""
    if export_id not in export_store:
        raise HTTPException(status_code=404, detail="Export not found")

    export_info = export_store[export_id]
    output_path = export_info["output_path"]

    if not os.path.exists(output_path):
        raise HTTPException(status_code=404, detail="Export file not found")

    return FileResponse(
        output_path,
        media_type="video/mp4",
        filename=f"export_{export_id}.mp4"
    )


@router.delete("/{video_id}/{clip_id}")
async def delete_clip(video_id: str, clip_id: str):
    """删除片段"""
    if video_id not in video_store:
        raise HTTPException(status_code=404, detail="Video not found")

    video = video_store[video_id]

    for i, clip in enumerate(video.clips):
        if clip.id == clip_id:
            video.clips.pop(i)
            return {"message": f"Clip {clip_id} deleted"}

    raise HTTPException(status_code=404, detail="Clip not found")
