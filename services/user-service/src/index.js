/**
 * User Service - Main Entry Point
 * Handles user profile management
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('../../../shared/db');
const config = require('../../../shared/config');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const requestIdMiddleware = require('./middlewares/requestId');

const app = express();
const PORT = config.port;

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'User Service is running', 
    timestamp: new Date().toISOString() 
  });
});

// Routes
app.use('/', routes);

// Error handler
app.use(errorHandler);

// Initialize database and start server
async function startServer() {
  try {
    await db.initPool();
    app.listen(PORT, () => {
      console.log(`🚀 User Service running on port ${PORT}`);
      console.log(`   Database: ${config.db.database}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;
