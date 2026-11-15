// Local Standalone Express Server Entry Point
const path = require('path');
const express = require('express');
const app = require('./server/app');

const PORT = process.env.PORT || 3000;

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html for client-side routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` JOYBOY — Red Hair Shanks AI Voice Chatbot`);
  console.log(` Server running at: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
