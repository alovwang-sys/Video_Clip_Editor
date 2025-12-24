import uuid
import logging
from typing import List, Optional
from datetime import datetime

from app.models.schemas import ClipInfo, VideoInfo, VideoStatus
from app.services.llm_client import ZhipuVideoAnalyzer
from app.services.oss_client import OSSClient
from app.services.video_processor import VideoProcessor
from app.config import settings

logger = logging.getLogger(__name__)


def time_str_to_seconds(time_str: str) -> float:
    """将时间字符串转换为秒数 (HH:MM:SS -> seconds)"""
    parts = time_str.split(':')
    if len(parts) == 3:
        hours, minutes, seconds = parts
        return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    elif len(parts) == 2:
        minutes, seconds = parts
        return int(minutes) * 60 + float(seconds)
    else:
        return float(parts[0])


class VideoAnalyzer:
    """视频分析服务"""

    def __init__(
        self,
        llm_client: ZhipuVideoAnalyzer,
        oss_client: OSSClient,
        video_processor: VideoProcessor
    ):
        self.llm_client = llm_client
        self.oss_client = oss_client
        self.video_processor = video_processor

    async def analyze_video(
        self,
        video_info: VideoInfo,
        prompt: Optional[str] = None
    ) -> List[ClipInfo]:
        """
        分析视频并返回精彩片段列表

        Args:
            video_info: 视频信息
            prompt: 自定义分析提示词

        Returns:
            精彩片段列表
        """
        logger.info(f"Starting video analysis for: {video_info.video_id}")

        # 上传视频到OSS获取公网URL
        if not video_info.oss_url:
            video_info.oss_url = self.oss_client.upload_file(video_info.file_path)
            logger.info(f"Video uploaded to OSS: {video_info.oss_url}")

        # 调用LLM分析视频
        result = self.llm_client.analyze_video(video_info.oss_url, prompt)

        # 解析结果并生成ClipInfo列表
        clips = []
        for i, clip_data in enumerate(result.get("clips", [])):
            clip_id = f"{video_info.video_id}_{i}_{uuid.uuid4().hex[:8]}"

            start_time = clip_data.get("start_time", "00:00:00")
            end_time = clip_data.get("end_time", "00:00:10")

            clip = ClipInfo(
                id=clip_id,
                start_time=start_time,
                end_time=end_time,
                start_seconds=time_str_to_seconds(start_time),
                end_seconds=time_str_to_seconds(end_time),
                description=clip_data.get("description", ""),
                highlight_type=clip_data.get("highlight_type", "精彩片段"),
                score=clip_data.get("score", 0.5),
                selected=False
            )
            clips.append(clip)

        logger.info(f"Found {len(clips)} clips for video: {video_info.video_id}")

        # 生成缩略图
        for clip in clips:
            try:
                thumbnail_path = self.video_processor.generate_thumbnail(
                    video_info.file_path,
                    clip.start_seconds,
                    video_info.video_id,
                    clip.id
                )
                clip.thumbnail_url = self.oss_client.upload_thumbnail(
                    thumbnail_path,
                    video_info.video_id,
                    clip.id
                )
            except Exception as e:
                logger.error(f"Error generating thumbnail for clip {clip.id}: {e}")

        return clips
