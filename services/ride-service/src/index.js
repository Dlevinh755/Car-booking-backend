const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3004;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage
let rides = [];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Ride Service is running', timestamp: new Date().toISOString() });
});

// Get all rides
app.get('/', (req, res) => {
  const { status, driverId } = req.query;
  let filteredRides = rides;
  
  if (status) {
    filteredRides = filteredRides.filter(r => r.status === status);
  }
  
  if (driverId) {
    filteredRides = filteredRides.filter(r => r.driverId === parseInt(driverId));
  }
  
  res.json({ rides: filteredRides });
});

// Get ride by ID
app.get('/:id', (req, res) => {
  const ride = rides.find(r => r.id === parseInt(req.params.id));
  
  if (!ride) {
    return res.status(404).json({ error: 'Ride not found' });
  }
  
  res.json({ ride });
});

// Create ride
app.post('/', (req, res) => {
  const { bookingId, driverId, pickupLocation, dropoffLocation, estimatedPrice } = req.body;
  
  if (!bookingId || !pickupLocation || !dropoffLocation) {
    return res.status(400).json({ error: 'bookingId, pickupLocation, and dropoffLocation are required' });
  }
  
  const ride = {
    id: rides.length + 1,
    bookingId,
    driverId,
    pickupLocation,
    dropoffLocation,
    estimatedPrice,
    status: 'requested',
    startTime: null,
    endTime: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  rides.push(ride);
  res.status(201).json({ message: 'Ride created successfully', ride });
});

// Update ride status
app.patch('/:id/status', (req, res) => {
  const rideIndex = rides.findIndex(r => r.id === parseInt(req.params.id));
  
  if (rideIndex === -1) {
    return res.status(404).json({ error: 'Ride not found' });
  }
  
  const { status } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  rides[rideIndex].status = status;
  rides[rideIndex].updatedAt = new Date();
  
  if (status === 'in-progress') {
    rides[rideIndex].startTime = new Date();
  } else if (status === 'completed') {
    rides[rideIndex].endTime = new Date();
  }
  
  res.json({ message: 'Ride status updated', ride: rides[rideIndex] });
});

// Assign driver
app.patch('/:id/assign-driver', (req, res) => {
  const rideIndex = rides.findIndex(r => r.id === parseInt(req.params.id));
  
  if (rideIndex === -1) {
    return res.status(404).json({ error: 'Ride not found' });
  }
  
  const { driverId } = req.body;
  
  if (!driverId) {
    return res.status(400).json({ error: 'driverId is required' });
  }
  
  rides[rideIndex].driverId = driverId;
  rides[rideIndex].status = 'assigned';
  rides[rideIndex].updatedAt = new Date();
  
  res.json({ message: 'Driver assigned successfully', ride: rides[rideIndex] });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Ride Service running on port ${PORT}`);
});
