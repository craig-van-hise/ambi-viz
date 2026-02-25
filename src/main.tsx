import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { initRemoteLogger } from './utils/remoteLogger'
import './index.css'
import App from './App.tsx'

initRemoteLogger()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
