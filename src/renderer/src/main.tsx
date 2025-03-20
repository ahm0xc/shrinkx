import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './app'
import MenuBar from './components/menu-bar'
import { ThemeProvider } from './components/theme-provider'

import './assets/globals.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <MenuBar />
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
