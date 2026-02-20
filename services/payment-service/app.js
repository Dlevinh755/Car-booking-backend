const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('../../shared/db');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const requestIdMiddleware = require('./middlewares/requestId');

const app = express();
const PORT = process.env.PORT || 3006;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Payment Service is running', 
    timestamp: new Date().toISOString(),
    service: 'payment-service'
  });
});

// Routes
app.use('/', routes);

// Error handler
app.use(errorHandler);

// Initialize database when app is required
const initDB = async () => {
  try {
    await db.initPool();
    console.log('✓ Database connection pool initialized');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

initDB();

module.exports = app;

