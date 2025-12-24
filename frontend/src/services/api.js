import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 300000, // 5分钟超时，视频上传可能较慢
});

// 视频相关API
export const videoApi = {
  // 获取视频列表
  list: async () => {
    const response = await api.get('/videos');
    return response.data;
  },

  // 上传视频
  upload: async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });
    return response.data;
  },

  // 获取视频状态
  getStatus: async (videoId) => {
    const response = await api.get(`/videos/${videoId}/status`);
    return response.data;
  },

  // 获取视频信息
  getInfo: async (videoId) => {
    const response = await api.get(`/videos/${videoId}/info`);
    return response.data;
  },

  // 分析视频
  analyze: async (videoId, prompt = null) => {
    const response = await api.post(`/videos/${videoId}/analyze`, { prompt });
    return response.data;
  },

  // 获取视频流地址
  getStreamUrl: (videoId) => {
    return `/api/videos/${videoId}/stream`;
  },
};

// 片段相关API
export const clipsApi = {
  // 获取片段列表
  getClips: async (videoId) => {
    const response = await api.get(`/clips/${videoId}`);
    return response.data;
  },

  // 切换片段选中状态
  toggleSelection: async (videoId, clipId, selected) => {
    const response = await api.put(
      `/clips/${videoId}/${clipId}/select?selected=${selected}`
    );
    return response.data;
  },

  // 获取片段预览
  getPreviewUrl: (clipId) => {
    return `/api/clips/${clipId}/preview`;
  },

  // 获取缩略图
  getThumbnail: async (clipId) => {
    const response = await api.get(`/clips/${clipId}/thumbnail`);
    return response.data;
  },

  // 导出片段
  exportClips: async (videoId, clipIds, options = {}) => {
    const response = await api.post(`/clips/${videoId}/export`, {
      clip_ids: clipIds,
      format: options.format || 'mp4',
      resolution: options.resolution || '1080p',
      merge: options.merge !== false,
    });
    return response.data;
  },

  // 删除片段
  deleteClip: async (videoId, clipId) => {
    const response = await api.delete(`/clips/${videoId}/${clipId}`);
    return response.data;
  },
};

export default api;
