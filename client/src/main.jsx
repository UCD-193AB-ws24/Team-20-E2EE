import React from 'react'
import ReactDOM from 'react-dom/client'
import { SocketProvider, AppProvider } from './components'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { CorbadoContextProvider } from './components/CorbadoContextProvider'
ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AppProvider>
      <SocketProvider>
        <CorbadoContextProvider>
          <App />
        </CorbadoContextProvider>
      </SocketProvider>
    </AppProvider>
  </BrowserRouter>
)
