// Starts the site: fonts, styles, then the app.
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/500.css';
import '@fontsource/pixelify-sans/600.css';
import App from './App.jsx';
import './styles/theme.css';
import './styles/league.css';
import './styles/auth.css';
import './styles/console.css';
import './styles/roster.css';
import './styles/market.css';
import './styles/attributes.css';
import './styles/sandbox.css';
import './styles/layout.css';
import './styles/home.css';
import './styles/calendar.css';
import './styles/trades.css';
import './styles/draft.css';
import './styles/draftStage.css';
import './styles/draftReveal.css';
import './styles/motion.css';

createRoot(document.getElementById('root')).render(<App />);
