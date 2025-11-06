import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import "antd/dist/reset.css"; // v5+

// Suppress Ant Design warnings that are not critical
const originalWarn = console.warn;
console.warn = (...args) => {
  const message = args[0]?.toString?.() || '';
  // Filter out known Ant Design warnings
  if (
    message.includes('[antd: compatible]') ||
    message.includes('[antd: message]') ||
    message.includes('Static function can not consume context')
  ) {
    return;
  }
  originalWarn(...args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
