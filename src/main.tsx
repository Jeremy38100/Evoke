import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { GameProvider } from './context/GameContext.tsx'
import { ToastProvider } from './context/ToastContext.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <GameProvider>
      <App />
    </GameProvider>
  </ToastProvider>
)
