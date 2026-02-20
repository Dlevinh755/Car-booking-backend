const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const db = require('../../../shared/db');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const requestIdMiddleware = require('./middlewares/requestId');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Booking Service is running', 
    timestamp: new Date().toISOString(),
    service: 'booking-service'
  });
});

// Routes
app.use('/', routes);

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Initialize database connection pool
    await db.initPool();
    console.log('✓ Database connection pool initialized');

    app.listen(PORT, () => {
      console.log(`✓ Booking Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start Booking Service:', error);
    process.exit(1);
  }
};

startServer();
