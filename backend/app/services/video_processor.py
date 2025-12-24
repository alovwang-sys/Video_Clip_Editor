import ffmpeg
import os
import uuid
import logging
from pathlib import Path
from typing import List, Optional, Tuple

from app.config import settings

logger = logging.getLogger(__name__)


class VideoProcessor:
    """FFmpeg视频处理服务"""

    def __init__(self, output_dir: str = None):
        self.output_dir = output_dir or settings.OUTPUT_DIR
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)

    def get_video_info(self, video_path: str) -> dict:
        """
        获取视频信息

        Args:
            video_path: 视频文件路径

        Returns:
            包含视频信息的字典
        """
        try:
            probe = ffmpeg.probe(video_path)
            video_stream = next(
                (s for s in probe['streams'] if s['codec_type'] == 'video'),
                None
            )

            if video_stream:
                return {
                    'duration': float(probe['format'].get('duration', 0)),
                    'width': int(video_stream.get('width', 0)),
                    'height': int(video_stream.get('height', 0)),
                    'fps': eval(video_stream.get('r_frame_rate', '30/1')),
                    'codec': video_stream.get('codec_name', ''),
                    'bitrate': int(probe['format'].get('bit_rate', 0))
                }
        except Exception as e:
            logger.error(f"Error getting video info: {e}")

        return {}

    def generate_thumbnail(
        self,
        video_path: str,
        timestamp: float,
        video_id: str,
        clip_id: str
    ) -> str:
        """
        生成视频缩略图

        Args:
            video_path: 视频文件路径
            timestamp: 截取时间点（秒）
            video_id: 视频ID
            clip_id: 片段ID

        Returns:
            缩略图文件路径
        """
        thumbnail_dir = Path(self.output_dir) / "thumbnails" / video_id
        thumbnail_dir.mkdir(parents=True, exist_ok=True)

        thumbnail_path = str(thumbnail_dir / f"{clip_id}.jpg")

        try:
            (
                ffmpeg
                .input(video_path, ss=timestamp)
                .filter('scale', 320, -1)
                .output(thumbnail_path, vframes=1)
                .overwrite_output()
                .run(quiet=True)
            )
            logger.info(f"Thumbnail generated: {thumbnail_path}")
            return thumbnail_path
        except Exception as e:
            logger.error(f"Error generating thumbnail: {e}")
            raise

    def cut_clip(
        self,
        video_path: str,
        start_time: float,
        end_time: float,
        output_path: Optional[str] = None
    ) -> str:
        """
        剪切视频片段

        Args:
            video_path: 源视频路径
            start_time: 开始时间（秒）
            end_time: 结束时间（秒）
            output_path: 输出路径，不传则自动生成

        Returns:
            输出文件路径
        """
        if output_path is None:
            output_path = str(
                Path(self.output_dir) / f"clip_{uuid.uuid4().hex}.mp4"
            )

        duration = end_time - start_time

        try:
            (
                ffmpeg
                .input(video_path, ss=start_time, t=duration)
                .output(
                    output_path,
                    c='copy',
                    avoid_negative_ts='make_zero'
                )
                .overwrite_output()
                .run(quiet=True)
            )
            logger.info(f"Clip cut: {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Error cutting clip: {e}")
            raise

    def merge_clips(
        self,
        clip_paths: List[str],
        output_path: Optional[str] = None
    ) -> str:
        """
        合并多个视频片段

        Args:
            clip_paths: 片段文件路径列表
            output_path: 输出路径，不传则自动生成

        Returns:
            输出文件路径
        """
        if output_path is None:
            output_path = str(
                Path(self.output_dir) / f"merged_{uuid.uuid4().hex}.mp4"
            )

        # 创建合并列表文件
        list_file = str(Path(self.output_dir) / f"concat_{uuid.uuid4().hex}.txt")

        try:
            with open(list_file, 'w') as f:
                for clip_path in clip_paths:
                    f.write(f"file '{clip_path}'\n")

            (
                ffmpeg
                .input(list_file, format='concat', safe=0)
                .output(output_path, c='copy')
                .overwrite_output()
                .run(quiet=True)
            )

            logger.info(f"Clips merged: {output_path}")
            return output_path
        except Exception as e:
            logger.error(f"Error merging clips: {e}")
            raise
        finally:
            if os.path.exists(list_file):
                os.remove(list_file)

    def export_clips(
        self,
        video_path: str,
        clips: List[Tuple[float, float]],
        merge: bool = True,
        resolution: str = "1080p"
    ) -> str:
        """
        导出选中的片段

        Args:
            video_path: 源视频路径
            clips: 片段列表 [(start, end), ...]
            merge: 是否合并为单个视频
            resolution: 输出分辨率

        Returns:
            输出文件路径（合并模式）或目录路径（分开模式）
        """
        resolution_map = {
            "480p": (854, 480),
            "720p": (1280, 720),
            "1080p": (1920, 1080),
            "4k": (3840, 2160)
        }

        width, height = resolution_map.get(resolution, (1920, 1080))

        clip_paths = []
        for i, (start, end) in enumerate(clips):
            clip_path = str(
                Path(self.output_dir) / f"temp_clip_{i}_{uuid.uuid4().hex}.mp4"
            )
            self.cut_clip(video_path, start, end, clip_path)
            clip_paths.append(clip_path)

        if merge and len(clip_paths) > 1:
            output_path = self.merge_clips(clip_paths)
            # 清理临时文件
            for path in clip_paths:
                if os.path.exists(path):
                    os.remove(path)
            return output_path
        elif len(clip_paths) == 1:
            return clip_paths[0]
        else:
            return self.output_dir

    def generate_preview(
        self,
        video_path: str,
        start_time: float,
        duration: float = 10.0
    ) -> str:
        """
        生成预览视频（低质量，用于快速预览）

        Args:
            video_path: 源视频路径
            start_time: 开始时间
            duration: 预览时长

        Returns:
            预览视频路径
        """
        preview_path = str(
            Path(self.output_dir) / f"preview_{uuid.uuid4().hex}.mp4"
        )

        try:
            (
                ffmpeg
                .input(video_path, ss=start_time, t=duration)
                .filter('scale', 640, -1)
                .output(
                    preview_path,
                    vcodec='libx264',
                    crf=28,
                    preset='ultrafast'
                )
                .overwrite_output()
                .run(quiet=True)
            )
            return preview_path
        except Exception as e:
            logger.error(f"Error generating preview: {e}")
            raise

    def split_video(
        self,
        video_path: str,
        segment_duration: float = 300.0,  # 5分钟
        output_dir: Optional[str] = None
    ) -> List[dict]:
        """
        将视频切分成多个片段

        Args:
            video_path: 源视频路径
            segment_duration: 每个片段的时长（秒），默认5分钟
            output_dir: 输出目录，不传则使用默认目录

        Returns:
            片段信息列表 [{"path": str, "start": float, "end": float, "index": int}, ...]
        """
        if output_dir is None:
            output_dir = str(Path(self.output_dir) / "segments")
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        video_info = self.get_video_info(video_path)
        total_duration = video_info.get('duration', 0)

        if total_duration == 0:
            logger.error(f"Cannot get video duration: {video_path}")
            return []

        segments = []
        segment_index = 0
        current_time = 0.0

        while current_time < total_duration:
            end_time = min(current_time + segment_duration, total_duration)
            segment_id = uuid.uuid4().hex[:8]
            output_path = str(Path(output_dir) / f"segment_{segment_index}_{segment_id}.mp4")

            try:
                duration = end_time - current_time
                (
                    ffmpeg
                    .input(video_path, ss=current_time, t=duration)
                    .output(
                        output_path,
                        c='copy',
                        avoid_negative_ts='make_zero'
                    )
                    .overwrite_output()
                    .run(quiet=True)
                )

                segments.append({
                    "path": output_path,
                    "start": current_time,
                    "end": end_time,
                    "index": segment_index,
                    "duration": duration
                })

                logger.info(f"Segment {segment_index} created: {output_path} ({current_time:.1f}s - {end_time:.1f}s)")

            except Exception as e:
                logger.error(f"Error creating segment {segment_index}: {e}")

            current_time = end_time
            segment_index += 1

        logger.info(f"Video split into {len(segments)} segments")
        return segments
