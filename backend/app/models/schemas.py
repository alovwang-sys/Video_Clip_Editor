from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime


class VideoStatus(str, Enum):
    PENDING = "pending"
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    ANALYZING = "analyzing"
    ANALYZED = "analyzed"
    EXPORTING = "exporting"
    COMPLETED = "completed"
    ERROR = "error"


class ClipInfo(BaseModel):
    """精彩片段信息"""
    id: str
    start_time: str  # 格式: HH:MM:SS
    end_time: str    # 格式: HH:MM:SS
    start_seconds: float
    end_seconds: float
    description: str
    highlight_type: str
    score: float = Field(ge=0, le=1)
    thumbnail_url: Optional[str] = None
    selected: bool = False


class VideoUploadResponse(BaseModel):
    """视频上传响应"""
    video_id: str
    filename: str
    status: VideoStatus
    message: str


class VideoStatusResponse(BaseModel):
    """视频状态响应"""
    video_id: str
    status: VideoStatus
    progress: int = Field(ge=0, le=100)
    message: str
    duration: Optional[float] = None
    thumbnail_url: Optional[str] = None


class ClipsResponse(BaseModel):
    """精彩片段列表响应"""
    video_id: str
    clips: List[ClipInfo]
    total_count: int


class ExportRequest(BaseModel):
    """导出请求"""
    clip_ids: List[str]
    format: str = "mp4"
    resolution: str = "1080p"
    merge: bool = True  # 是否合并为单个视频


class ExportResponse(BaseModel):
    """导出响应"""
    export_id: str
    video_id: str
    status: str
    download_url: Optional[str] = None
    message: str


class AnalyzeRequest(BaseModel):
    """分析请求"""
    prompt: Optional[str] = None  # 自定义分析提示词


class VideoInfo(BaseModel):
    """视频信息"""
    video_id: str
    filename: str
    file_path: str
    oss_url: Optional[str] = None
    status: VideoStatus = VideoStatus.PENDING
    duration: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    fps: Optional[float] = None
    clips: List[ClipInfo] = []
    error_message: Optional[str] = None
    # 分段信息
    parent_video_id: Optional[str] = None  # 如果是分段，指向原视频
    segment_index: Optional[int] = None    # 分段序号
    segment_start: Optional[float] = None  # 分段开始时间（秒）
    segment_end: Optional[float] = None    # 分段结束时间（秒）
    is_segment: bool = False               # 是否为分段
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
