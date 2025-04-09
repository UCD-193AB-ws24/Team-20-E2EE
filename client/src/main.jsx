import React from 'react'
import ReactDOM from 'react-dom/client'
import { SocketProvider, AppProvider } from './components'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppProvider>
      <SocketProvider>
        <App />
      </SocketProvider>
    </AppProvider>
  </BrowserRouter>
)
