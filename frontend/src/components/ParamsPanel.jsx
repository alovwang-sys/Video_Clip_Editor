import ClipCard from './ClipCard';

function ParamsPanel({
  videoInfo,
  clips,
  selectedClips,
  onClipSelect,
  onClipPreview,
  onClipDelete,
  onExport,
  isExporting,
  exportSettings,
  onExportSettingsChange
}) {
  const selectedCount = selectedClips?.length || 0;

  return (
    <div className="w-80 bg-panel-bg border-l border-border-dark flex flex-col h-full">
      {/* 视频信息 */}
      {videoInfo && (
        <div className="p-4 border-b border-border-dark">
          <h3 className="text-text-primary font-medium mb-3">视频信息</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">文件名</span>
              <span className="text-text-secondary truncate ml-2 max-w-[180px]">{videoInfo.filename}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">分辨率</span>
              <span className="text-text-secondary">{videoInfo.width}x{videoInfo.height}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">时长</span>
              <span className="text-text-secondary">{Math.round(videoInfo.duration)}秒</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-muted">状态</span>
              <span className={`${videoInfo.status === 'analyzed' ? 'text-accent' : 'text-text-secondary'}`}>
                {videoInfo.status === 'analyzed' ? '已分析' : videoInfo.status}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 片段列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-text-primary font-medium">精彩片段</h3>
          {clips?.length > 0 && (
            <span className="text-text-muted text-sm">
              {selectedCount}/{clips.length} 已选
            </span>
          )}
        </div>

        {clips?.length > 0 ? (
          <div className="space-y-3">
            {clips.map((clip) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                isSelected={selectedClips?.includes(clip.id)}
                onSelect={() => onClipSelect?.(clip.id)}
                onPreview={() => onClipPreview?.(clip)}
                onDelete={() => onClipDelete?.(clip.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-text-muted mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
            <p className="text-text-muted text-sm">暂无片段</p>
            <p className="text-text-muted text-xs mt-1">使用AI识别功能分析视频</p>
          </div>
        )}
      </div>

      {/* 导出设置 */}
      <div className="p-4 border-t border-border-dark space-y-4">
        <h3 className="text-text-primary font-medium">导出设置</h3>

        <div className="space-y-3">
          <div>
            <label className="text-text-muted text-sm block mb-1">分辨率</label>
            <select
              value={exportSettings?.resolution || '1080p'}
              onChange={(e) => onExportSettingsChange?.({ ...exportSettings, resolution: e.target.value })}
              className="w-full bg-card-bg border border-border-dark rounded px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4k">4K</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="merge"
              checked={exportSettings?.merge !== false}
              onChange={(e) => onExportSettingsChange?.({ ...exportSettings, merge: e.target.checked })}
              className="w-4 h-4 rounded border-border-dark bg-card-bg text-accent focus:ring-accent"
            />
            <label htmlFor="merge" className="text-text-secondary text-sm">
              合并为单个视频
            </label>
          </div>
        </div>

        <button
          onClick={onExport}
          disabled={selectedCount === 0 || isExporting}
          className={`
            w-full py-3 px-4 rounded-lg font-medium transition-all duration-200
            ${selectedCount > 0 && !isExporting
              ? 'bg-accent hover:bg-accent-hover text-black'
              : 'bg-card-bg text-text-muted cursor-not-allowed'}
          `}
        >
          {isExporting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              导出中...
            </span>
          ) : (
            `导出 ${selectedCount} 个片段`
          )}
        </button>
      </div>
    </div>
  );
}

export default ParamsPanel;
