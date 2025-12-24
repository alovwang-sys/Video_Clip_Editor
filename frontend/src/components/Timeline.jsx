function Timeline({
  duration,
  currentTime,
  clips,
  selectedClips,
  onSeek,
  onClipClick
}) {
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    if (onSeek) {
      onSeek(pos * duration);
    }
  };

  const getClipPosition = (clip) => {
    const left = (clip.start_seconds / duration) * 100;
    const width = ((clip.end_seconds - clip.start_seconds) / duration) * 100;
    return { left: `${left}%`, width: `${width}%` };
  };

  // 生成时间刻度
  const generateTimeMarks = () => {
    if (!duration) return [];
    const marks = [];
    const interval = duration > 300 ? 60 : duration > 60 ? 10 : 5;
    for (let i = 0; i <= duration; i += interval) {
      marks.push({
        time: i,
        position: (i / duration) * 100,
      });
    }
    return marks;
  };

  const timeMarks = generateTimeMarks();
  const playheadPosition = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-panel-bg border-t border-border-dark p-4">
      {/* 时间刻度 */}
      <div className="relative h-6 mb-2">
        {timeMarks.map((mark) => (
          <div
            key={mark.time}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${mark.position}%`, transform: 'translateX(-50%)' }}
          >
            <div className="w-px h-2 bg-border-dark" />
            <span className="text-text-muted text-xs mt-1">
              {formatTime(mark.time)}
            </span>
          </div>
        ))}
      </div>

      {/* 时间线轨道 */}
      <div
        className="relative h-16 bg-card-bg rounded cursor-pointer timeline-track"
        onClick={handleClick}
      >
        {/* 片段块 */}
        {clips?.map((clip) => {
          const { left, width } = getClipPosition(clip);
          const isSelected = selectedClips?.includes(clip.id);
          return (
            <div
              key={clip.id}
              className={`
                absolute top-2 bottom-2 rounded cursor-pointer
                transition-all duration-200
                ${isSelected ? 'bg-accent' : 'bg-accent/50 hover:bg-accent/70'}
              `}
              style={{ left, width, minWidth: '4px' }}
              onClick={(e) => {
                e.stopPropagation();
                onClipClick?.(clip);
              }}
              title={`${clip.description}\n${clip.start_time} - ${clip.end_time}`}
            >
              <div className="h-full flex items-center justify-center overflow-hidden px-1">
                <span className="text-black text-xs truncate font-medium">
                  {clip.highlight_type}
                </span>
              </div>
            </div>
          );
        })}

        {/* 播放头 */}
        {duration > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
            style={{ left: `${playheadPosition}%` }}
          >
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full" />
          </div>
        )}
      </div>

      {/* 轨道标签 */}
      <div className="flex items-center mt-2 text-xs text-text-muted">
        <span className="w-20">视频轨道</span>
        <span className="flex-1 text-center">
          {clips?.length > 0 ? `${clips.length} 个精彩片段` : '暂无片段'}
        </span>
        <span className="w-20 text-right">
          {formatTime(duration || 0)}
        </span>
      </div>
    </div>
  );
}

export default Timeline;
