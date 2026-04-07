import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyAppTheme, applyPublicTheme, resolveThemeForUser } from './lib/theme'

try {
  const token = localStorage.getItem('token')
  if (!token) {
    applyPublicTheme()
  } else {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    applyAppTheme(resolveThemeForUser(u))
  }
} catch {
  applyPublicTheme()
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
