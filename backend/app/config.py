import os
from pathlib import Path
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # 智谱AI配置
    ZHIPU_API_KEY: str = os.getenv("ZHIPU_API_KEY", "")
    ZHIPU_MODEL: str = os.getenv("ZHIPU_MODEL", "glm-4.6v")

    # 阿里云OSS配置
    OSS_ACCESS_KEY_ID: str = os.getenv("OSS_ACCESS_KEY_ID", "")
    OSS_ACCESS_KEY_SECRET: str = os.getenv("OSS_ACCESS_KEY_SECRET", "")
    OSS_ENDPOINT: str = os.getenv("OSS_ENDPOINT", "oss-cn-hangzhou.aliyuncs.com")
    OSS_BUCKET_NAME: str = os.getenv("OSS_BUCKET_NAME", "")

    # 服务配置
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./uploads")
    OUTPUT_DIR: str = os.getenv("OUTPUT_DIR", "./outputs")
    SERVER_HOST: str = os.getenv("SERVER_HOST", "0.0.0.0")
    SERVER_PORT: int = int(os.getenv("SERVER_PORT", "8000"))

    # 确保目录存在
    def ensure_dirs(self):
        Path(self.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
        Path(self.OUTPUT_DIR).mkdir(parents=True, exist_ok=True)

    class Config:
        env_file = ".env"


settings = Settings()
settings.ensure_dirs()
