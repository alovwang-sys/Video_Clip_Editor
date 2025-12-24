function ClipCard({ clip, isSelected, onSelect, onPreview, onDelete }) {
  const formatTime = (timeStr) => {
    return timeStr;
  };

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.5) return 'text-yellow-400';
    return 'text-text-muted';
  };

  return (
    <div
      className={`
        bg-card-bg rounded-lg overflow-hidden border transition-all duration-200
        ${isSelected ? 'border-accent' : 'border-transparent hover:border-border-dark'}
      `}
    >
      {/* 缩略图区域 */}
      <div className="relative aspect-video bg-black">
        {clip.thumbnail_url ? (
          <img
            src={clip.thumbnail_url}
            alt={clip.description}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* 时间标签 */}
        <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded text-xs">
          {formatTime(clip.start_time)} - {formatTime(clip.end_time)}
        </div>

        {/* 分数标签 */}
        <div className={`absolute top-2 right-2 bg-black/70 px-2 py-0.5 rounded text-xs ${getScoreColor(clip.score)}`}>
          {Math.round(clip.score * 100)}%
        </div>

        {/* 预览按钮 */}
        <button
          onClick={() => onPreview?.(clip)}
          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/50 transition-colors group"
        >
          <svg className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>

      {/* 信息区域 */}
      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="inline-block bg-accent/20 text-accent text-xs px-2 py-0.5 rounded mb-1">
              {clip.highlight_type}
            </span>
            <p className="text-text-primary text-sm line-clamp-2">{clip.description}</p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onSelect?.(clip)}
            className={`
              flex-1 py-1.5 px-3 rounded text-sm font-medium transition-colors
              ${isSelected
                ? 'bg-accent text-black'
                : 'bg-border-dark text-text-primary hover:bg-accent/20'}
            `}
          >
            {isSelected ? '已选中' : '选择'}
          </button>
          <button
            onClick={() => onDelete?.(clip)}
            className="p-1.5 rounded text-text-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default ClipCard;
