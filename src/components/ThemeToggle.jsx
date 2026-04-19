import { useTheme } from '../context/ThemeContext.jsx'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <button type="button" className="theme-toggle" onClick={toggleTheme} aria-label="Toggle color theme">
      <span className="theme-toggle-track">
        <span className={`theme-toggle-thumb ${theme === 'dark' ? 'is-dark' : ''}`} />
      </span>
      <span className="theme-toggle-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  )
}
