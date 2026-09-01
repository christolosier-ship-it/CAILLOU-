import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from './app/App'
import { registerPwa } from './pwa/registerServiceWorker'
import './styles/global.css'
import './styles/showroom.css'

registerPwa()

const root = document.getElementById('root')

if (!root) {
  throw new Error('CAILLOU™ root element is missing.')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
