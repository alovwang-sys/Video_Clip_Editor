# 视频精彩片段识别与自动剪辑系统

## 项目概述

一个智能视频处理系统，支持上传视频、通过多模态LLM识别精彩片段、自动剪辑并导出MP4。

## 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端 | React 18 + Vite + TailwindCSS |
| 后端 | Python FastAPI |
| 视频处理 | FFmpeg (ffmpeg-python) |
| LLM接口 | 智谱AI GLM-4.6V (视频理解) |
| 对象存储 | 阿里云 OSS (提供公网URL) |
| 本地存储 | uploads/ outputs/ |

## 目录结构

```
video_cut/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── components/
│   │   │   ├── Sidebar.jsx            # 左侧素材面板
│   │   │   ├── VideoPlayer.jsx        # 中间视频预览
│   │   │   ├── ParamsPanel.jsx        # 右侧参数面板
│   │   │   ├── Timeline.jsx           # 底部时间线
│   │   │   ├── ClipCard.jsx           # 片段卡片
│   │   │   └── UploadArea.jsx         # 上传区域
│   │   ├── pages/
│   │   │   └── Editor.jsx             # 编辑器主页
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   └── index.css
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routers/
│   │   │   ├── video.py
│   │   │   └── clips.py
│   │   ├── services/
│   │   │   ├── llm_client.py          # 智谱AI客户端
│   │   │   ├── oss_client.py          # 阿里云OSS客户端
│   │   │   ├── video_analyzer.py      # 视频分析服务
│   │   │   └── video_processor.py     # FFmpeg视频处理
│   │   ├── models/
│   │   │   └── schemas.py
│   │   └── config.py
│   ├── uploads/
│   ├── outputs/
│   ├── requirements.txt
│   └── .env
│
└── .claude/
    └── claude.md
```

## 前端设计规范

### 参考风格：剪映Pro（深色主题）

### 布局结构
```
┌─────────────────────────────────────────────────────────────────┐
│  顶部工具栏                                          [导出]    │
├────────────┬──────────────────────────────┬────────────────────┤
│            │                              │                    │
│  左侧面板   │      视频预览播放器           │    右侧参数面板    │
│  - 导入    │                              │    - 视频信息      │
│  - 素材    │                              │    - 片段列表      │
│  - AI识别  │      ┌──────────────┐        │    - 导出设置      │
│            │      │   播放器     │        │                    │
│            │      └──────────────┘        │                    │
│            │       00:00:00 / 00:00:00    │                    │
│            │                              │                    │
├────────────┴──────────────────────────────┴────────────────────┤
│  时间线轨道区域                                                 │
│  ├──────────────────────────────────────────────────────────┤  │
│  │  视频轨道 [========精彩片段1===] [===片段2===] [==片段3==] │  │
│  ├──────────────────────────────────────────────────────────┤  │
└─────────────────────────────────────────────────────────────────┘
```

### TailwindCSS 配色方案（深色主题）

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // 主背景色
        'editor-bg': '#1a1a1a',
        // 面板背景
        'panel-bg': '#252525',
        // 卡片背景
        'card-bg': '#2d2d2d',
        // 边框色
        'border-dark': '#3a3a3a',
        // 强调色（青色，类似剪映）
        'accent': '#00d4aa',
        'accent-hover': '#00e6bb',
        // 文字颜色
        'text-primary': '#ffffff',
        'text-secondary': '#999999',
        'text-muted': '#666666',
      }
    }
  }
}
```

### 组件样式规范

- **背景**: `bg-editor-bg` (#1a1a1a)
- **面板**: `bg-panel-bg` (#252525)
- **卡片**: `bg-card-bg rounded-lg`
- **边框**: `border border-border-dark`
- **按钮主色**: `bg-accent hover:bg-accent-hover text-black`
- **按钮次级**: `bg-card-bg hover:bg-border-dark text-white`
- **圆角**: `rounded-md` (6px) / `rounded-lg` (8px)
- **间距**: 基于 4px (`p-2`, `p-4`, `gap-2`, `gap-4`)

## API 设计

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/videos/upload` | 上传视频 |
| GET | `/api/videos/{id}/status` | 获取处理状态 |
| GET | `/api/videos/{id}/clips` | 获取精彩片段 |
| POST | `/api/videos/{id}/export` | 导出片段 |
| GET | `/api/clips/{id}/preview` | 预览片段 |
| GET | `/api/clips/{id}/thumbnail` | 获取缩略图 |

## 后端配置

```env
# .env
# 智谱AI配置
ZHIPU_API_KEY=your-zhipu-api-key
ZHIPU_MODEL=glm-4.6v

# 阿里云OSS配置
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OSS_BUCKET_NAME=your-bucket-name

# 服务配置
UPLOAD_DIR=./uploads
OUTPUT_DIR=./outputs
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
```

## 阿里云 OSS 集成

### 安装 SDK
```bash
pip install oss2
```

### OSS 客户端封装
```python
# backend/app/services/oss_client.py
import oss2
import uuid
from pathlib import Path

class OSSClient:
    def __init__(self, access_key_id: str, access_key_secret: str,
                 endpoint: str, bucket_name: str):
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

    def upload_file(self, local_path: str, object_key: str = None) -> str:
        """
        上传本地文件到OSS

        Args:
            local_path: 本地文件路径
            object_key: OSS中的对象键名，不传则自动生成

        Returns:
            公网可访问的URL
        """
        if object_key is None:
            # 自动生成唯一文件名
            suffix = Path(local_path).suffix
            object_key = f"videos/{uuid.uuid4().hex}{suffix}"

        # 上传文件
        self.bucket.put_object_from_file(object_key, local_path)

        # 返回公网URL
        return self.get_public_url(object_key)

    def get_public_url(self, object_key: str) -> str:
        """
        获取文件的公网访问URL

        如果Bucket是公共读，直接返回URL
        如果是私有Bucket，返回签名URL（有效期1小时）
        """
        # 公共读Bucket直接拼接URL
        # return f"https://{self.bucket_name}.{self.endpoint}/{object_key}"

        # 私有Bucket生成签名URL（推荐，更安全）
        url = self.bucket.sign_url('GET', object_key, 3600)  # 1小时有效期
        return url

    def delete_file(self, object_key: str):
        """删除OSS中的文件"""
        self.bucket.delete_object(object_key)
```

### 使用示例
```python
from app.services.oss_client import OSSClient
from app.config import settings

# 初始化客户端
oss = OSSClient(
    access_key_id=settings.OSS_ACCESS_KEY_ID,
    access_key_secret=settings.OSS_ACCESS_KEY_SECRET,
    endpoint=settings.OSS_ENDPOINT,
    bucket_name=settings.OSS_BUCKET_NAME
)

# 上传视频并获取公网URL
video_url = oss.upload_file("/path/to/local/video.mp4")
print(video_url)  # https://bucket.oss-cn-hangzhou.aliyuncs.com/videos/xxx.mp4
```

## 智谱AI GLM-4.6V 集成

### API 端点
```
https://open.bigmodel.cn/api/paas/v4/chat/completions
```

### 视频分析请求格式
```python
# backend/app/services/llm_client.py
from openai import OpenAI

class ZhipuVideoAnalyzer:
    def __init__(self, api_key: str):
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://open.bigmodel.cn/api/paas/v4/"
        )

    async def analyze_video(self, video_url: str, prompt: str) -> dict:
        """
        分析视频并识别精彩片段
        video_url: 视频的可访问URL（需要后端提供静态文件服务）
        """
        response = self.client.chat.completions.create(
            model="glm-4.6v",
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
        return response.choices[0].message.content
```

### 精彩片段识别 Prompt 示例
```python
HIGHLIGHT_DETECTION_PROMPT = """
请分析这个视频，识别其中的精彩片段。

对于每个精彩片段，请返回以下JSON格式：
{
  "clips": [
    {
      "start_time": "00:01:23",
      "end_time": "00:01:45",
      "description": "精彩片段描述",
      "highlight_type": "类型（如：精彩进球、关键时刻、搞笑片段等）",
      "score": 0.95
    }
  ]
}

请确保：
1. 时间格式为 HH:MM:SS
2. 每个片段至少5秒，最长60秒
3. 按精彩程度从高到低排序
4. 只返回JSON，不要其他文字
"""
```

### 关键特性
- **128K 上下文窗口**: 支持约1小时视频内容分析
- **原生视频理解**: 直接传入视频URL，无需抽帧
- **Thinking模式**: 可选深度推理 `"thinking": {"type": "enabled"}`

## 核心流程

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│ 用户上传  │ →  │ 保存本地  │ →  │ 推送OSS  │ →  │ GLM分析  │ →  │ 用户选择  │ →  │ FFmpeg   │
│   视频   │    │ uploads/ │    │ 获取URL  │    │ 精彩片段  │    │  片段    │    │  剪辑    │
└──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘    └──────────┘
```

### 详细步骤

1. **用户上传视频**
   - 前端通过 `POST /api/videos/upload` 上传视频文件
   - 后端保存到本地 `uploads/` 目录，生成唯一 video_id

2. **推送到阿里云OSS**
   - 使用 `oss2` SDK 将视频上传到 OSS
   - 获取公网可访问的签名URL（有效期1小时）

3. **调用GLM-4.6V分析**
   - 将 OSS 视频 URL 发送给智谱AI GLM-4.6V
   - 模型分析视频内容，返回精彩片段时间戳列表

4. **生成缩略图**
   - 使用 FFmpeg 为每个精彩片段生成预览缩略图
   - 缩略图也可上传到 OSS 供前端展示

5. **用户选择片段**
   - 前端展示精彩片段列表（缩略图 + 描述 + 时间）
   - 用户勾选要导出的片段

6. **FFmpeg剪辑导出**
   - 根据用户选择，FFmpeg 剪切并合并片段
   - 导出 MP4 文件，可选上传到 OSS 提供下载链接

## 依赖

### 后端 requirements.txt
```
fastapi>=0.104.0
uvicorn>=0.24.0
python-multipart>=0.0.6
ffmpeg-python>=0.2.0
openai>=1.6.0
oss2>=2.18.0
python-dotenv>=1.0.0
pydantic>=2.5.0
aiofiles>=23.2.1
```

### 前端 package.json
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "react-dropzone": "^14.2.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```
