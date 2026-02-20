const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3008;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Review Service is running', 
    timestamp: new Date().toISOString(),
    service: 'review-service',
    note: 'Stub implementation - reviews not yet implemented'
  });
});

// Stub endpoint for creating review
app.post('/reviews', (req, res) => {
  const { userId, rideId, driverId, rating, comment } = req.body;
  
  console.log(`[STUB] Review would be created by user ${userId} for driver ${driverId}: ${rating} stars`);
  
  res.json({ 
    message: 'Review stub - not implemented yet',
    data: { userId, rideId, driverId, rating, comment }
  });
});

// Stub endpoint for getting driver reviews
app.get('/reviews/driver/:driverId', (req, res) => {
  const { driverId } = req.params;
  
  console.log(`[STUB] Driver ${driverId} reviews would be retrieved`);
  
  res.json({ 
    message: 'Review stub - not implemented yet',
    driverId,
    reviews: [],
    averageRating: 0
  });
});

// Stub endpoint for getting user reviews
app.get('/reviews/user/:userId', (req, res) => {
  const { userId } = req.params;
  
  console.log(`[STUB] User ${userId} reviews would be retrieved`);
  
  res.json({ 
    message: 'Review stub - not implemented yet',
    userId,
    reviews: []
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Review Service (stub) running on port ${PORT}`);
});

