import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DotGothic16', 'sans-serif'],
        orbitron: ['Orbitron', 'sans-serif']
      },
      colors: {
        background: '#0a0a0f',
        surface: '#12121a',
        'surface-hover': '#1a1a28',
        border: '#1e1e2e',
        'neon-cyan': '#00f0ff',
        'neon-magenta': '#ff2d95',
        'neon-yellow': '#f0f000',
        text: '#e0e0e0',
        'text-muted': '#888888'
      },
      boxShadow: {
        'neon-cyan': '0 0 8px rgba(0, 240, 255, 0.3), 0 0 20px rgba(0, 240, 255, 0.1)',
        'neon-cyan-lg': '0 0 15px rgba(0, 240, 255, 0.4), 0 0 40px rgba(0, 240, 255, 0.15)',
        'neon-magenta': '0 0 8px rgba(255, 45, 149, 0.3), 0 0 20px rgba(255, 45, 149, 0.1)',
        'neon-yellow': '0 0 8px rgba(240, 240, 0, 0.3), 0 0 20px rgba(240, 240, 0, 0.1)'
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite'
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' }
        }
      }
    }
  },
  plugins: []
}

export default config
