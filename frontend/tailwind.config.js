/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
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
    },
  },
  plugins: [],
}
