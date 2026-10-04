import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <main className="page">
      <h1>Fold</h1>
    </main>
  </StrictMode>
);
