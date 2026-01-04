import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const rootElement = document.getElementById('root')
if (!rootElement) {
  console.error('No root element found!')
} else {
  const root = createRoot(rootElement)
  root.render(<App />)
}
