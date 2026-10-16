import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Console } from './console.jsx';
import './styles.css';
import './admin.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Console />
  </StrictMode>
);
