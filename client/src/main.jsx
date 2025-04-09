import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import store from './state/store'
import { Provider } from 'react-redux'
import { CorbadoProvider } from '@corbado/react'

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <React.StrictMode>
      <BrowserRouter>
      <CorbadoProvider projectId={import.meta.env.VITE_REACT_APP_CORBADO_PROJECT_ID}>
        <App />
      </CorbadoProvider>  
      </BrowserRouter>
    </React.StrictMode>
  </Provider>
)
