const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3009;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Notification Service is running', 
    timestamp: new Date().toISOString(),
    service: 'notification-service',
    note: 'Stub implementation - notifications not yet implemented'
  });
});

// Stub endpoint for sending notifications
app.post('/notifications/send', (req, res) => {
  const { userId, title, message, type } = req.body;
  
  console.log(`[STUB] Notification would be sent to user ${userId}: ${title}`);
  
  res.json({ 
    message: 'Notification stub - not implemented yet',
    data: { userId, title, message, type }
  });
});

// Stub endpoint for sending email
app.post('/notifications/email', (req, res) => {
  const { to, subject, body } = req.body;
  
  console.log(`[STUB] Email would be sent to ${to}: ${subject}`);
  
  res.json({ 
    message: 'Email notification stub - not implemented yet',
    data: { to, subject }
  });
});

// Stub endpoint for sending SMS
app.post('/notifications/sms', (req, res) => {
  const { phone, message } = req.body;
  
  console.log(`[STUB] SMS would be sent to ${phone}: ${message}`);
  
  res.json({ 
    message: 'SMS notification stub - not implemented yet',
    data: { phone }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`✓ Notification Service (stub) running on port ${PORT}`);
});

