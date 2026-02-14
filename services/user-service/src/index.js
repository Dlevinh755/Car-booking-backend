const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage
let users = [];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'User Service is running', timestamp: new Date().toISOString() });
});

// Get all users
app.get('/', (req, res) => {
  res.json({ users });
});

// Get user by ID
app.get('/:id', (req, res) => {
  const user = users.find(u => u.id === parseInt(req.params.id));
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ user });
});

// Create user
app.post('/', (req, res) => {
  const { name, email, phone, role } = req.body;
  
  if (!name || !email) {
    return res.status(400).json({ error: 'Name and email are required' });
  }
  
  const user = {
    id: users.length + 1,
    name,
    email,
    phone,
    role: role || 'user',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  users.push(user);
  res.status(201).json({ message: 'User created successfully', user });
});

// Update user
app.put('/:id', (req, res) => {
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const { name, email, phone, role } = req.body;
  
  users[userIndex] = {
    ...users[userIndex],
    name: name || users[userIndex].name,
    email: email || users[userIndex].email,
    phone: phone || users[userIndex].phone,
    role: role || users[userIndex].role,
    updatedAt: new Date()
  };
  
  res.json({ message: 'User updated successfully', user: users[userIndex] });
});

// Delete user
app.delete('/:id', (req, res) => {
  const userIndex = users.findIndex(u => u.id === parseInt(req.params.id));
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  users.splice(userIndex, 1);
  res.json({ message: 'User deleted successfully' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`User Service running on port ${PORT}`);
});
