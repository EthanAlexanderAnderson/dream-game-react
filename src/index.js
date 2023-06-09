import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import io from 'socket.io-client'
let socket = io("/")

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
