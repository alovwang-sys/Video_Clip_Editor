import { useState, useCallback, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import VideoPlayer from '../components/VideoPlayer';
import ParamsPanel from '../components/ParamsPanel';
import Timeline from '../components/Timeline';
import { videoApi, clipsApi } from '../services/api';
import { PRESET_PROMPTS } from '../components/PromptSelector';

function Editor() {
  // 视频列表
  const [videos, setVideos] = useState([]);

  // 视频状态
  const [videoId, setVideoId] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);

  // 上传状态
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // 分析状态
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // 提示词状态
  const [selectedPromptId, setSelectedPromptId] = useState('highlight');
  const [customPrompt, setCustomPrompt] = useState('');

  // 片段状态
  const [clips, setClips] = useState([]);
  const [selectedClips, setSelectedClips] = useState([]);

  // 播放状态
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 导出状态
  const [isExporting, setIsExporting] = useState(false);
  const [exportSettings, setExportSettings] = useState({
    resolution: '1080p',
    merge: true,
  });

  // 加载视频列表
  useEffect(() => {
    const loadVideos = async () => {
      try {
        const list = await videoApi.list();
        setVideos(list);
        // 如果有视频，自动选择第一个
        if (list.length > 0 && !videoId) {
          handleSelectVideo(list[0]);
        }
      } catch (error) {
        console.error('Failed to load videos:', error);
      }
    };
    loadVideos();
  }, []);

  // 选择视频
  const handleSelectVideo = useCallback((video) => {
    setVideoId(video.video_id);
    setVideoInfo(video);
    setVideoUrl(videoApi.getStreamUrl(video.video_id));
    setClips([]);
    setSelectedClips([]);
    setCurrentTime(0);
  }, []);

  // 上传视频
  const handleUpload = useCallback(async (file) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const result = await videoApi.upload(file, setUploadProgress);
      setVideoId(result.video_id);

      // 获取视频信息
      const info = await videoApi.getInfo(result.video_id);
      setVideoInfo(info);

      // 设置视频URL
      setVideoUrl(videoApi.getStreamUrl(result.video_id));

      // 更新视频列表
      setVideos((prev) => [...prev, info]);

      // 重置状态
      setClips([]);
      setSelectedClips([]);
      setCurrentTime(0);
    } catch (error) {
      console.error('Upload error:', error);
      alert('上传失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsUploading(false);
    }
  }, []);

  // 分析视频
  const handleAnalyze = useCallback(async () => {
    if (!videoId) return;

    setIsAnalyzing(true);

    try {
      // 获取当前使用的提示词
      let promptToUse = null;
      if (selectedPromptId === 'custom') {
        promptToUse = customPrompt;
      } else {
        const preset = PRESET_PROMPTS.find(p => p.id === selectedPromptId);
        promptToUse = preset?.prompt || null;
      }

      await videoApi.analyze(videoId, promptToUse);

      // 获取分析结果
      const clipsResult = await clipsApi.getClips(videoId);
      setClips(clipsResult.clips);

      // 更新视频信息
      const info = await videoApi.getInfo(videoId);
      setVideoInfo(info);
    } catch (error) {
      console.error('Analyze error:', error);
      alert('分析失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsAnalyzing(false);
    }
  }, [videoId, selectedPromptId, customPrompt]);

  // 选择/取消选择片段
  const handleClipSelect = useCallback((clipId) => {
    setSelectedClips((prev) => {
      if (prev.includes(clipId)) {
        return prev.filter((id) => id !== clipId);
      } else {
        return [...prev, clipId];
      }
    });
  }, []);

  // 预览片段
  const handleClipPreview = useCallback((clip) => {
    setCurrentTime(clip.start_seconds);
  }, []);

  // 删除片段
  const handleClipDelete = useCallback(async (clipId) => {
    if (!videoId) return;

    try {
      await clipsApi.deleteClip(videoId, clipId);
      setClips((prev) => prev.filter((c) => c.id !== clipId));
      setSelectedClips((prev) => prev.filter((id) => id !== clipId));
    } catch (error) {
      console.error('Delete error:', error);
      alert('删除失败: ' + (error.response?.data?.detail || error.message));
    }
  }, [videoId]);

  // 导出片段
  const handleExport = useCallback(async () => {
    if (!videoId || selectedClips.length === 0) return;

    setIsExporting(true);

    try {
      const result = await clipsApi.exportClips(videoId, selectedClips, exportSettings);

      if (result.download_url) {
        // 打开下载链接
        window.open(result.download_url, '_blank');
      }

      alert('导出成功!');
    } catch (error) {
      console.error('Export error:', error);
      alert('导出失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsExporting(false);
    }
  }, [videoId, selectedClips, exportSettings]);

  // 时间线跳转
  const handleSeek = useCallback((time) => {
    setCurrentTime(time);
  }, []);

  // 片段点击
  const handleTimelineClipClick = useCallback((clip) => {
    setCurrentTime(clip.start_seconds);
    handleClipSelect(clip.id);
  }, [handleClipSelect]);

  return (
    <div className="h-screen flex flex-col">
      {/* 顶部工具栏 */}
      <header className="h-14 bg-panel-bg border-b border-border-dark flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-accent rounded flex items-center justify-center">
            <svg className="w-5 h-5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-text-primary font-medium">视频精彩片段识别与自动剪辑系统</h1>
        </div>

        <div className="flex items-center gap-3">
          {videoInfo && (
            <span className="text-text-muted text-sm">
              {videoInfo.filename}
            </span>
          )}
          <button
            onClick={handleExport}
            disabled={selectedClips.length === 0 || isExporting}
            className={`
              px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${selectedClips.length > 0 && !isExporting
                ? 'bg-accent hover:bg-accent-hover text-black'
                : 'bg-card-bg text-text-muted cursor-not-allowed'}
            `}
          >
            {isExporting ? '导出中...' : '导出'}
          </button>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧面板 */}
        <Sidebar
          videos={videos}
          onSelectVideo={handleSelectVideo}
          onUpload={handleUpload}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          videoInfo={videoInfo}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
          selectedPromptId={selectedPromptId}
          onPromptIdChange={setSelectedPromptId}
          customPrompt={customPrompt}
          onCustomPromptChange={setCustomPrompt}
        />

        {/* 中间视频预览 */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1">
            <VideoPlayer
              videoUrl={videoUrl}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              onDurationChange={setDuration}
            />
          </div>

          {/* 底部时间线 */}
          <Timeline
            duration={duration}
            currentTime={currentTime}
            clips={clips}
            selectedClips={selectedClips}
            onSeek={handleSeek}
            onClipClick={handleTimelineClipClick}
          />
        </div>

        {/* 右侧参数面板 */}
        <ParamsPanel
          videoInfo={videoInfo}
          clips={clips}
          selectedClips={selectedClips}
          onClipSelect={handleClipSelect}
          onClipPreview={handleClipPreview}
          onClipDelete={handleClipDelete}
          onExport={handleExport}
          isExporting={isExporting}
          exportSettings={exportSettings}
          onExportSettingsChange={setExportSettings}
        />
      </div>
    </div>
  );
}

export default Editor;
