import { useState } from 'react';
import UploadArea from './UploadArea';
import PromptSelector from './PromptSelector';

function Sidebar({
  videos = [],
  onSelectVideo,
  onUpload,
  isUploading,
  uploadProgress,
  videoInfo,
  onAnalyze,
  isAnalyzing,
  selectedPromptId,
  onPromptIdChange,
  customPrompt,
  onCustomPromptChange
}) {
  const [activeTab, setActiveTab] = useState('import');

  const tabs = [
    { id: 'import', label: '导入', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
    { id: 'clips', label: '素材', icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' },
    { id: 'ai', label: 'AI识别', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  ];

  return (
    <div className="w-64 bg-panel-bg border-r border-border-dark flex flex-col h-full">
      {/* 标签栏 */}
      <div className="flex border-b border-border-dark">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 py-3 px-2 text-sm flex flex-col items-center gap-1
              transition-colors duration-200
              ${activeTab === tab.id
                ? 'text-accent border-b-2 border-accent bg-accent/5'
                : 'text-text-secondary hover:text-text-primary'}
            `}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
            </svg>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'import' && (
          <div className="space-y-4">
            <h3 className="text-text-primary font-medium">导入视频</h3>
            <UploadArea
              onUpload={onUpload}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
            />
            {videoInfo && (
              <div className="bg-card-bg rounded-lg p-3 space-y-2">
                <p className="text-text-primary text-sm truncate">{videoInfo.filename}</p>
                <p className="text-text-muted text-xs">
                  {videoInfo.width}x{videoInfo.height} · {Math.round(videoInfo.duration)}秒
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'clips' && (
          <div className="space-y-4">
            <h3 className="text-text-primary font-medium">素材库</h3>
            {videos.length > 0 ? (
              <div className="space-y-3">
                {/* 先显示原视频 */}
                {videos.filter(v => !v.is_segment).map((video) => (
                  <div key={video.video_id} className="space-y-2">
                    <div
                      onClick={() => onSelectVideo && onSelectVideo(video)}
                      className={`
                        bg-card-bg rounded-lg p-3 cursor-pointer transition-all duration-200
                        hover:bg-border-dark
                        ${videoInfo?.video_id === video.video_id ? 'ring-2 ring-accent' : ''}
                      `}
                    >
                      <p className="text-text-primary text-sm truncate">{video.filename}</p>
                      <p className="text-text-muted text-xs">
                        {video.width}x{video.height} · {Math.round(video.duration)}秒
                        {video.duration > 300 && (
                          <span className="text-accent ml-2">已切分</span>
                        )}
                      </p>
                    </div>

                    {/* 显示该视频的分段 */}
                    {videos
                      .filter(v => v.is_segment && v.parent_video_id === video.video_id)
                      .sort((a, b) => a.segment_index - b.segment_index)
                      .map((segment) => (
                        <div
                          key={segment.video_id}
                          onClick={() => onSelectVideo && onSelectVideo(segment)}
                          className={`
                            ml-4 bg-card-bg/50 rounded-lg p-2 cursor-pointer transition-all duration-200
                            hover:bg-border-dark border-l-2 border-accent/30
                            ${videoInfo?.video_id === segment.video_id ? 'ring-2 ring-accent border-accent' : ''}
                          `}
                        >
                          <p className="text-text-primary text-xs truncate">
                            片段 {segment.segment_index + 1}
                          </p>
                          <p className="text-text-muted text-xs">
                            {Math.floor(segment.segment_start / 60)}:{String(Math.floor(segment.segment_start % 60)).padStart(2, '0')} -
                            {Math.floor(segment.segment_end / 60)}:{String(Math.floor(segment.segment_end % 60)).padStart(2, '0')}
                            <span className="ml-2">({Math.round(segment.duration)}秒)</span>
                          </p>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-text-muted text-sm">暂无素材，请先导入视频</p>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-4">
            <h3 className="text-text-primary font-medium">AI智能识别</h3>
            <p className="text-text-muted text-sm">
              使用AI自动识别视频中的精彩片段
            </p>

            {/* 提示词选择器 */}
            <PromptSelector
              selectedPrompt={selectedPromptId || 'highlight'}
              onPromptChange={onPromptIdChange}
              customPrompt={customPrompt || ''}
              onCustomPromptChange={onCustomPromptChange}
            />

            <button
              onClick={onAnalyze}
              disabled={!videoInfo || isAnalyzing}
              className={`
                w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
                ${videoInfo && !isAnalyzing
                  ? 'bg-accent hover:bg-accent-hover text-black'
                  : 'bg-card-bg text-text-muted cursor-not-allowed'}
              `}
            >
              {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  分析中...
                </span>
              ) : (
                '开始智能识别'
              )}
            </button>
            {!videoInfo && (
              <p className="text-text-muted text-xs text-center">请先导入视频</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Sidebar;
