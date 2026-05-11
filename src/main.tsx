import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { migrateFromLocalStorage } from './storage'

migrateFromLocalStorage().then((legacyMigrated) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App legacyMigrated={legacyMigrated} />
    </StrictMode>,
  )
})
