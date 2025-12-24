import { useState } from 'react';

// 内置预设提示词
const PRESET_PROMPTS = [
  {
    id: 'highlight',
    name: '精彩片段识别',
    description: '识别视频中的高能、精彩瞬间',
    prompt: `请分析这个视频，识别其中的精彩片段。

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
4. 只返回JSON，不要其他文字`
  },
  {
    id: 'funny',
    name: '搞笑片段',
    description: '识别视频中的搞笑、幽默时刻',
    prompt: `请分析这个视频，识别其中的搞笑片段。

重点关注：
- 搞笑的动作或表情
- 幽默的对话或场景
- 意外的搞笑时刻
- 可爱或滑稽的画面

对于每个搞笑片段，请返回以下JSON格式：
{
  "clips": [
    {
      "start_time": "00:01:23",
      "end_time": "00:01:45",
      "description": "搞笑片段描述",
      "highlight_type": "搞笑类型",
      "score": 0.95
    }
  ]
}

请确保：
1. 时间格式为 HH:MM:SS
2. 每个片段至少3秒，最长30秒
3. 按搞笑程度从高到低排序
4. 只返回JSON，不要其他文字`
  },
  {
    id: 'action',
    name: '动作场景',
    description: '识别激烈的动作、运动场景',
    prompt: `请分析这个视频，识别其中的精彩动作场景。

重点关注：
- 激烈的运动或动作
- 精彩的技巧展示
- 快速运动的画面
- 高难度动作

对于每个动作片段，请返回以下JSON格式：
{
  "clips": [
    {
      "start_time": "00:01:23",
      "end_time": "00:01:45",
      "description": "动作场景描述",
      "highlight_type": "动作类型",
      "score": 0.95
    }
  ]
}

请确保：
1. 时间格式为 HH:MM:SS
2. 每个片段至少3秒，最长45秒
3. 按精彩程度从高到低排序
4. 只返回JSON，不要其他文字`
  },
  {
    id: 'emotional',
    name: '情感高潮',
    description: '识别情感丰富的感人时刻',
    prompt: `请分析这个视频，识别其中情感丰富的片段。

重点关注：
- 感人的场景
- 情绪高涨的时刻
- 重要的情感交流
- 催泪或温馨的画面

对于每个情感片段，请返回以下JSON格式：
{
  "clips": [
    {
      "start_time": "00:01:23",
      "end_time": "00:01:45",
      "description": "情感片段描述",
      "highlight_type": "情感类型",
      "score": 0.95
    }
  ]
}

请确保：
1. 时间格式为 HH:MM:SS
2. 每个片段至少5秒，最长60秒
3. 按情感强度从高到低排序
4. 只返回JSON，不要其他文字`
  },
  {
    id: 'key_moments',
    name: '关键时刻',
    description: '识别视频中的关键信息点',
    prompt: `请分析这个视频，识别其中的关键时刻。

重点关注：
- 重要的信息点
- 转折性的场景
- 核心内容出现的时刻
- 值得关注的关键画面

对于每个关键片段，请返回以下JSON格式：
{
  "clips": [
    {
      "start_time": "00:01:23",
      "end_time": "00:01:45",
      "description": "关键时刻描述",
      "highlight_type": "关键类型",
      "score": 0.95
    }
  ]
}

请确保：
1. 时间格式为 HH:MM:SS
2. 每个片段至少5秒，最长60秒
3. 按重要程度从高到低排序
4. 只返回JSON，不要其他文字`
  },
  {
    id: 'custom',
    name: '自定义',
    description: '输入自己的提示词',
    prompt: ''
  }
];

function PromptSelector({ selectedPrompt, onPromptChange, customPrompt, onCustomPromptChange }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const currentPreset = PRESET_PROMPTS.find(p => p.id === selectedPrompt) || PRESET_PROMPTS[0];
  const isCustom = selectedPrompt === 'custom';

  return (
    <div className="space-y-3">
      {/* 提示词选择器 */}
      <div>
        <label className="text-text-muted text-sm block mb-2">识别模式</label>
        <div className="relative">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full bg-card-bg border border-border-dark rounded-lg px-3 py-2.5 text-left flex items-center justify-between hover:border-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-text-primary text-sm font-medium">{currentPreset.name}</div>
              <div className="text-text-muted text-xs truncate">{currentPreset.description}</div>
            </div>
            <svg
              className={`w-4 h-4 text-text-muted ml-2 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* 下拉选项 */}
          {isExpanded && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card-bg border border-border-dark rounded-lg shadow-lg z-20 max-h-64 overflow-y-auto">
              {PRESET_PROMPTS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    onPromptChange(preset.id);
                    setIsExpanded(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left hover:bg-border-dark transition-colors first:rounded-t-lg last:rounded-b-lg ${
                    selectedPrompt === preset.id ? 'bg-accent/10 border-l-2 border-accent' : ''
                  }`}
                >
                  <div className="text-text-primary text-sm font-medium">{preset.name}</div>
                  <div className="text-text-muted text-xs">{preset.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 自定义提示词输入 */}
      {isCustom && (
        <div>
          <label className="text-text-muted text-sm block mb-2">自定义提示词</label>
          <textarea
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            placeholder="请输入你的提示词，告诉AI你想识别什么样的片段..."
            className="w-full bg-card-bg border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none"
            rows={6}
          />
          <p className="text-text-muted text-xs mt-1">
            提示：描述你想要识别的片段类型，AI 会返回符合要求的时间戳
          </p>
        </div>
      )}

      {/* 预览当前提示词（非自定义模式） */}
      {!isCustom && (
        <div>
          <button
            onClick={() => {
              // 切换到自定义模式并使用当前预设作为初始值
              onCustomPromptChange(currentPreset.prompt);
              onPromptChange('custom');
            }}
            className="text-accent text-xs hover:underline"
          >
            基于此模板编辑
          </button>
        </div>
      )}
    </div>
  );
}

// 导出预设供外部使用
export { PRESET_PROMPTS };
export default PromptSelector;
