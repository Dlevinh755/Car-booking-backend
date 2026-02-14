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

// In-memory storage
let reviews = [];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Review Service is running', timestamp: new Date().toISOString() });
});

// Get all reviews
app.get('/', (req, res) => {
  const { rideId, driverId, userId } = req.query;
  let filteredReviews = reviews;
  
  if (rideId) {
    filteredReviews = filteredReviews.filter(r => r.rideId === parseInt(rideId));
  }
  
  if (driverId) {
    filteredReviews = filteredReviews.filter(r => r.driverId === parseInt(driverId));
  }
  
  if (userId) {
    filteredReviews = filteredReviews.filter(r => r.userId === parseInt(userId));
  }
  
  res.json({ reviews: filteredReviews });
});

// Get review by ID
app.get('/:id', (req, res) => {
  const review = reviews.find(r => r.id === parseInt(req.params.id));
  
  if (!review) {
    return res.status(404).json({ error: 'Review not found' });
  }
  
  res.json({ review });
});

// Create review
app.post('/', (req, res) => {
  const { userId, rideId, driverId, rating, comment } = req.body;
  
  if (!userId || !rideId || !driverId || !rating) {
    return res.status(400).json({ error: 'userId, rideId, driverId, and rating are required' });
  }
  
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }
  
  const review = {
    id: reviews.length + 1,
    userId,
    rideId,
    driverId,
    rating,
    comment: comment || '',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  reviews.push(review);
  res.status(201).json({ message: 'Review created successfully', review });
});

// Update review
app.put('/:id', (req, res) => {
  const reviewIndex = reviews.findIndex(r => r.id === parseInt(req.params.id));
  
  if (reviewIndex === -1) {
    return res.status(404).json({ error: 'Review not found' });
  }
  
  const { rating, comment } = req.body;
  
  if (rating && (rating < 1 || rating > 5)) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }
  
  reviews[reviewIndex] = {
    ...reviews[reviewIndex],
    rating: rating || reviews[reviewIndex].rating,
    comment: comment !== undefined ? comment : reviews[reviewIndex].comment,
    updatedAt: new Date()
  };
  
  res.json({ message: 'Review updated successfully', review: reviews[reviewIndex] });
});

// Delete review
app.delete('/:id', (req, res) => {
  const reviewIndex = reviews.findIndex(r => r.id === parseInt(req.params.id));
  
  if (reviewIndex === -1) {
    return res.status(404).json({ error: 'Review not found' });
  }
  
  reviews.splice(reviewIndex, 1);
  res.json({ message: 'Review deleted successfully' });
});

// Get driver average rating
app.get('/driver/:driverId/average', (req, res) => {
  const driverReviews = reviews.filter(r => r.driverId === parseInt(req.params.driverId));
  
  if (driverReviews.length === 0) {
    return res.json({ driverId: parseInt(req.params.driverId), averageRating: 0, totalReviews: 0 });
  }
  
  const totalRating = driverReviews.reduce((sum, r) => sum + r.rating, 0);
  const averageRating = totalRating / driverReviews.length;
  
  res.json({
    driverId: parseInt(req.params.driverId),
    averageRating: parseFloat(averageRating.toFixed(2)),
    totalReviews: driverReviews.length
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Review Service running on port ${PORT}`);
});
