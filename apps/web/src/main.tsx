import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'

// Simple app without LeafyGreen
import { SimpleApp } from './SimpleApp'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <SimpleApp />
  </BrowserRouter>
)
