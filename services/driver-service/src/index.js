const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage
let drivers = [];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Driver Service is running', timestamp: new Date().toISOString() });
});

// Get all drivers
app.get('/', (req, res) => {
  const { status, available } = req.query;
  let filteredDrivers = drivers;
  
  if (status) {
    filteredDrivers = filteredDrivers.filter(d => d.status === status);
  }
  
  if (available !== undefined) {
    filteredDrivers = filteredDrivers.filter(d => d.available === (available === 'true'));
  }
  
  res.json({ drivers: filteredDrivers });
});

// Get driver by ID
app.get('/:id', (req, res) => {
  const driver = drivers.find(d => d.id === parseInt(req.params.id));
  
  if (!driver) {
    return res.status(404).json({ error: 'Driver not found' });
  }
  
  res.json({ driver });
});

// Create driver
app.post('/', (req, res) => {
  const { name, email, phone, licenseNumber, vehicleType, vehicleNumber } = req.body;
  
  if (!name || !email || !licenseNumber || !vehicleNumber) {
    return res.status(400).json({ error: 'name, email, licenseNumber, and vehicleNumber are required' });
  }
  
  const driver = {
    id: drivers.length + 1,
    name,
    email,
    phone,
    licenseNumber,
    vehicleType: vehicleType || 'sedan',
    vehicleNumber,
    status: 'active',
    available: true,
    rating: 5.0,
    totalRides: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  drivers.push(driver);
  res.status(201).json({ message: 'Driver created successfully', driver });
});

// Update driver
app.put('/:id', (req, res) => {
  const driverIndex = drivers.findIndex(d => d.id === parseInt(req.params.id));
  
  if (driverIndex === -1) {
    return res.status(404).json({ error: 'Driver not found' });
  }
  
  const { name, phone, vehicleType, vehicleNumber, status, available } = req.body;
  
  drivers[driverIndex] = {
    ...drivers[driverIndex],
    name: name || drivers[driverIndex].name,
    phone: phone || drivers[driverIndex].phone,
    vehicleType: vehicleType || drivers[driverIndex].vehicleType,
    vehicleNumber: vehicleNumber || drivers[driverIndex].vehicleNumber,
    status: status || drivers[driverIndex].status,
    available: available !== undefined ? available : drivers[driverIndex].available,
    updatedAt: new Date()
  };
  
  res.json({ message: 'Driver updated successfully', driver: drivers[driverIndex] });
});

// Update driver availability
app.patch('/:id/availability', (req, res) => {
  const driverIndex = drivers.findIndex(d => d.id === parseInt(req.params.id));
  
  if (driverIndex === -1) {
    return res.status(404).json({ error: 'Driver not found' });
  }
  
  const { available } = req.body;
  
  if (available === undefined) {
    return res.status(400).json({ error: 'available field is required' });
  }
  
  drivers[driverIndex].available = available;
  drivers[driverIndex].updatedAt = new Date();
  
  res.json({ message: 'Driver availability updated', driver: drivers[driverIndex] });
});

// Update driver location
app.patch('/:id/location', (req, res) => {
  const driverIndex = drivers.findIndex(d => d.id === parseInt(req.params.id));
  
  if (driverIndex === -1) {
    return res.status(404).json({ error: 'Driver not found' });
  }
  
  const { latitude, longitude } = req.body;
  
  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'latitude and longitude are required' });
  }
  
  drivers[driverIndex].location = { latitude, longitude };
  drivers[driverIndex].updatedAt = new Date();
  
  res.json({ message: 'Driver location updated', driver: drivers[driverIndex] });
});

// Delete driver
app.delete('/:id', (req, res) => {
  const driverIndex = drivers.findIndex(d => d.id === parseInt(req.params.id));
  
  if (driverIndex === -1) {
    return res.status(404).json({ error: 'Driver not found' });
  }
  
  drivers.splice(driverIndex, 1);
  res.json({ message: 'Driver deleted successfully' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Driver Service running on port ${PORT}`);
});
