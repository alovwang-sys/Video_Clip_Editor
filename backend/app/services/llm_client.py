from openai import OpenAI
import httpx
import json
import re
import logging
from typing import Optional

from app.prompts import HIGHLIGHT_DETECTION_PROMPT

logger = logging.getLogger(__name__)

# 配置超时时间（秒）
DEFAULT_TIMEOUT = 300  # 5分钟
MAX_RETRIES = 3


class ZhipuVideoAnalyzer:
    """智谱AI GLM-4.6V 视频分析客户端"""

    def __init__(self, api_key: str, model: str = "glm-4.6v"):
        """
        初始化智谱AI客户端

        Args:
            api_key: 智谱AI API密钥
            model: 模型名称，默认 glm-4.6v
        """
        # 创建自定义 httpx 客户端，设置长超时
        http_client = httpx.Client(
            timeout=httpx.Timeout(DEFAULT_TIMEOUT, connect=60.0)
        )
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://open.bigmodel.cn/api/paas/v4/",
            http_client=http_client,
            max_retries=MAX_RETRIES
        )
        self.model = model

    def analyze_video(
        self,
        video_url: str,
        prompt: Optional[str] = None
    ) -> dict:
        """
        分析视频并识别精彩片段

        Args:
            video_url: 视频的公网可访问URL
            prompt: 自定义分析提示词，不传则使用默认提示词

        Returns:
            解析后的精彩片段列表
        """
        if prompt is None:
            prompt = HIGHLIGHT_DETECTION_PROMPT

        logger.info(f"Analyzing video: {video_url}")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "video_url",
                                "video_url": {"url": video_url}
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            )

            content = response.choices[0].message.content
            logger.info(f"LLM response: {content}")

            result = self._parse_response(content)
            return result

        except Exception as e:
            logger.error(f"Error analyzing video: {e}")
            raise

    def _parse_response(self, content: str) -> dict:
        """
        解析LLM返回的内容

        Args:
            content: LLM返回的原始内容

        Returns:
            解析后的字典
        """
        json_match = re.search(r'\{[\s\S]*\}', content)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError as e:
                logger.error(f"JSON parse error: {e}")
                return {"clips": []}

        return {"clips": []}

    def analyze_with_thinking(
        self,
        video_url: str,
        prompt: Optional[str] = None
    ) -> dict:
        """
        使用深度推理模式分析视频

        Args:
            video_url: 视频的公网可访问URL
            prompt: 自定义分析提示词

        Returns:
            解析后的精彩片段列表
        """
        if prompt is None:
            prompt = HIGHLIGHT_DETECTION_PROMPT

        logger.info(f"Analyzing video with thinking mode: {video_url}")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "video_url",
                                "video_url": {"url": video_url}
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ],
                extra_body={"thinking": {"type": "enabled"}}
            )

            content = response.choices[0].message.content
            return self._parse_response(content)

        except Exception as e:
            logger.error(f"Error analyzing video with thinking: {e}")
            raise
