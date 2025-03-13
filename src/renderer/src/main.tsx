import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './app'

import './assets/globals.css'
import { ThemeProvider } from './components/theme-provider'
import MenuBarDragArea from './components/menu-bar-drag-area'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <MenuBarDragArea />
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
