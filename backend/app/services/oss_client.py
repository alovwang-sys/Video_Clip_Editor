import oss2
import uuid
from pathlib import Path
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class OSSClient:
    """阿里云OSS客户端封装"""

    def __init__(
        self,
        access_key_id: str,
        access_key_secret: str,
        endpoint: str,
        bucket_name: str
    ):
        """
        初始化阿里云OSS客户端

        Args:
            access_key_id: 阿里云 AccessKey ID
            access_key_secret: 阿里云 AccessKey Secret
            endpoint: OSS端点，如 oss-cn-hangzhou.aliyuncs.com
            bucket_name: Bucket名称
        """
        self.auth = oss2.Auth(access_key_id, access_key_secret)
        self.bucket = oss2.Bucket(self.auth, endpoint, bucket_name)
        self.bucket_name = bucket_name
        self.endpoint = endpoint

    def upload_file(self, local_path: str, object_key: Optional[str] = None) -> str:
        """
        上传本地文件到OSS

        Args:
            local_path: 本地文件路径
            object_key: OSS中的对象键名，不传则自动生成

        Returns:
            公网可访问的URL
        """
        if object_key is None:
            suffix = Path(local_path).suffix
            object_key = f"videos/{uuid.uuid4().hex}{suffix}"

        logger.info(f"Uploading file to OSS: {local_path} -> {object_key}")
        self.bucket.put_object_from_file(object_key, local_path)

        url = self.get_public_url(object_key)
        logger.info(f"File uploaded successfully: {url}")
        return url

    def upload_thumbnail(self, local_path: str, video_id: str, clip_id: str) -> str:
        """
        上传缩略图到OSS

        Args:
            local_path: 本地缩略图路径
            video_id: 视频ID
            clip_id: 片段ID

        Returns:
            公网可访问的URL
        """
        suffix = Path(local_path).suffix
        object_key = f"thumbnails/{video_id}/{clip_id}{suffix}"

        self.bucket.put_object_from_file(object_key, local_path)
        return self.get_public_url(object_key)

    def get_public_url(self, object_key: str, expires: int = 3600) -> str:
        """
        获取文件的公网访问URL

        Args:
            object_key: OSS对象键名
            expires: 签名URL有效期（秒），默认1小时

        Returns:
            签名URL
        """
        url = self.bucket.sign_url('GET', object_key, expires)
        return url

    def delete_file(self, object_key: str) -> None:
        """删除OSS中的文件"""
        logger.info(f"Deleting file from OSS: {object_key}")
        self.bucket.delete_object(object_key)

    def file_exists(self, object_key: str) -> bool:
        """检查文件是否存在"""
        return self.bucket.object_exists(object_key)
