const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'API Gateway is running', timestamp: new Date().toISOString() });
});

// Service routes configuration
const services = {
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
  booking: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
  ride: process.env.RIDE_SERVICE_URL || 'http://localhost:3004',
  driver: process.env.DRIVER_SERVICE_URL || 'http://localhost:3005',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3006',
  pricing: process.env.PRICING_SERVICE_URL || 'http://localhost:3007',
  review: process.env.REVIEW_SERVICE_URL || 'http://localhost:3008',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3009'
};

// Proxy middleware options
const proxyOptions = (target) => ({
  target,
  changeOrigin: true,
  pathRewrite: (path, req) => {
    // Remove the service prefix from the path
    const serviceName = path.split('/')[2];
    return path.replace(`/api/${serviceName}`, '');
  },
  onError: (err, req, res) => {
    console.error(`Proxy error for ${target}:`, err.message);
    res.status(500).json({ 
      error: 'Service unavailable', 
      message: 'The requested service is currently unavailable' 
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.path} to ${target}`);
    
    // Rewrite body if it was parsed by express.json()
    if (req.body) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
});

// Route to services
app.use('/api/auth', createProxyMiddleware(proxyOptions(services.auth)));
app.use('/api/users', createProxyMiddleware(proxyOptions(services.user)));
app.use('/api/bookings', createProxyMiddleware(proxyOptions(services.booking)));
app.use('/api/rides', createProxyMiddleware(proxyOptions(services.ride)));
app.use('/api/drivers', createProxyMiddleware(proxyOptions(services.driver)));
app.use('/api/payments', createProxyMiddleware(proxyOptions(services.payment)));
app.use('/api/pricing', createProxyMiddleware(proxyOptions(services.pricing)));
app.use('/api/reviews', createProxyMiddleware(proxyOptions(services.review)));
app.use('/api/notifications', createProxyMiddleware(proxyOptions(services.notification)));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log('Service endpoints:');
  Object.entries(services).forEach(([name, url]) => {
    console.log(`  - ${name}: ${url}`);
  });
});
