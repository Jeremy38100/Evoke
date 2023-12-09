import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { PeerJSProvider } from './context/PeerJSContext.tsx'
import { GameProvider } from './context/GameContext.tsx'
import { ToastProvider } from './context/ToastContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ToastProvider>
    <PeerJSProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </PeerJSProvider>
  </ToastProvider>
)
