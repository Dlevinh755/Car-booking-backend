const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage (replace with database in production)
let users = [];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Auth Service is running', timestamp: new Date().toISOString() });
});

// Register
app.post('/register', (req, res) => {
  const { email, password, name, role } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name are required' });
  }
  
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: 'User already exists' });
  }
  
  const user = {
    id: users.length + 1,
    email,
    password, // In production, hash this password
    name,
    role: role || 'user',
    createdAt: new Date()
  };
  
  users.push(user);
  
  const { password: _, ...userWithoutPassword } = user;
  res.status(201).json({ message: 'User registered successfully', user: userWithoutPassword });
});

// Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // In production, generate JWT token
  const token = `mock-token-${user.id}`;
  const { password: _, ...userWithoutPassword } = user;
  
  res.json({ message: 'Login successful', token, user: userWithoutPassword });
});

// Verify token
app.post('/verify', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }
  
  // Mock verification
  const userId = token.split('-')[2];
  const user = users.find(u => u.id === parseInt(userId));
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  const { password: _, ...userWithoutPassword } = user;
  res.json({ valid: true, user: userWithoutPassword });
});

// Logout
app.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Auth Service running on port ${PORT}`);
});
