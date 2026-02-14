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

// In-memory storage
let notifications = [];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Notification Service is running', timestamp: new Date().toISOString() });
});

// Get all notifications
app.get('/', (req, res) => {
  const { userId, read } = req.query;
  let filteredNotifications = notifications;
  
  if (userId) {
    filteredNotifications = filteredNotifications.filter(n => n.userId === parseInt(userId));
  }
  
  if (read !== undefined) {
    filteredNotifications = filteredNotifications.filter(n => n.read === (read === 'true'));
  }
  
  res.json({ notifications: filteredNotifications });
});

// Get notification by ID
app.get('/:id', (req, res) => {
  const notification = notifications.find(n => n.id === parseInt(req.params.id));
  
  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  
  res.json({ notification });
});

// Send notification
app.post('/send', (req, res) => {
  const { userId, title, message, type } = req.body;
  
  if (!userId || !title || !message) {
    return res.status(400).json({ error: 'userId, title, and message are required' });
  }
  
  const notification = {
    id: notifications.length + 1,
    userId,
    title,
    message,
    type: type || 'info',
    read: false,
    createdAt: new Date()
  };
  
  notifications.push(notification);
  
  // In production, this would send via email, SMS, push notification, etc.
  console.log(`Notification sent to user ${userId}: ${title}`);
  
  res.status(201).json({ message: 'Notification sent successfully', notification });
});

// Send email notification
app.post('/send-email', (req, res) => {
  const { to, subject, body } = req.body;
  
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'to, subject, and body are required' });
  }
  
  // In production, this would use nodemailer or similar
  console.log(`Email would be sent to ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  
  res.json({ message: 'Email notification sent successfully', to, subject });
});

// Send SMS notification
app.post('/send-sms', (req, res) => {
  const { phone, message } = req.body;
  
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message are required' });
  }
  
  // In production, this would use Twilio or similar
  console.log(`SMS would be sent to ${phone}`);
  console.log(`Message: ${message}`);
  
  res.json({ message: 'SMS notification sent successfully', phone });
});

// Mark notification as read
app.patch('/:id/read', (req, res) => {
  const notificationIndex = notifications.findIndex(n => n.id === parseInt(req.params.id));
  
  if (notificationIndex === -1) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  
  notifications[notificationIndex].read = true;
  
  res.json({ message: 'Notification marked as read', notification: notifications[notificationIndex] });
});

// Mark all notifications as read for a user
app.post('/mark-all-read', (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  let count = 0;
  notifications.forEach(n => {
    if (n.userId === parseInt(userId) && !n.read) {
      n.read = true;
      count++;
    }
  });
  
  res.json({ message: `${count} notifications marked as read`, userId });
});

// Delete notification
app.delete('/:id', (req, res) => {
  const notificationIndex = notifications.findIndex(n => n.id === parseInt(req.params.id));
  
  if (notificationIndex === -1) {
    return res.status(404).json({ error: 'Notification not found' });
  }
  
  notifications.splice(notificationIndex, 1);
  res.json({ message: 'Notification deleted successfully' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Notification Service running on port ${PORT}`);
});
