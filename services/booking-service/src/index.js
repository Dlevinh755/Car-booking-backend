const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage
let bookings = [];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Booking Service is running', timestamp: new Date().toISOString() });
});

// Get all bookings
app.get('/', (req, res) => {
  const { userId } = req.query;
  
  if (userId) {
    const userBookings = bookings.filter(b => b.userId === parseInt(userId));
    return res.json({ bookings: userBookings });
  }
  
  res.json({ bookings });
});

// Get booking by ID
app.get('/:id', (req, res) => {
  const booking = bookings.find(b => b.id === parseInt(req.params.id));
  
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  res.json({ booking });
});

// Create booking
app.post('/', (req, res) => {
  const { userId, rideId, pickupLocation, dropoffLocation, scheduledTime } = req.body;
  
  if (!userId || !pickupLocation || !dropoffLocation) {
    return res.status(400).json({ error: 'userId, pickupLocation, and dropoffLocation are required' });
  }
  
  const booking = {
    id: bookings.length + 1,
    userId,
    rideId,
    pickupLocation,
    dropoffLocation,
    scheduledTime: scheduledTime || new Date(),
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  bookings.push(booking);
  res.status(201).json({ message: 'Booking created successfully', booking });
});

// Update booking status
app.patch('/:id/status', (req, res) => {
  const bookingIndex = bookings.findIndex(b => b.id === parseInt(req.params.id));
  
  if (bookingIndex === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  bookings[bookingIndex].status = status;
  bookings[bookingIndex].updatedAt = new Date();
  
  res.json({ message: 'Booking status updated', booking: bookings[bookingIndex] });
});

// Cancel booking
app.delete('/:id', (req, res) => {
  const bookingIndex = bookings.findIndex(b => b.id === parseInt(req.params.id));
  
  if (bookingIndex === -1) {
    return res.status(404).json({ error: 'Booking not found' });
  }
  
  bookings[bookingIndex].status = 'cancelled';
  bookings[bookingIndex].updatedAt = new Date();
  
  res.json({ message: 'Booking cancelled successfully', booking: bookings[bookingIndex] });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Booking Service running on port ${PORT}`);
});
