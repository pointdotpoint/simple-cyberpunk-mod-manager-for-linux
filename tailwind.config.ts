import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        surface: '#12121a',
        border: '#1e1e2e',
        'neon-cyan': '#00f0ff',
        'neon-magenta': '#ff2d95',
        'neon-yellow': '#f0f000',
        text: '#e0e0e0',
        'text-muted': '#888888'
      }
    }
  },
  plugins: []
}

export default config
