const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Pricing configuration
const pricingConfig = {
  baseFare: 2.5,
  perKm: 1.2,
  perMinute: 0.3,
  surgePricing: {
    enabled: false,
    multiplier: 1.0
  },
  vehicleTypes: {
    sedan: { multiplier: 1.0 },
    suv: { multiplier: 1.5 },
    luxury: { multiplier: 2.0 }
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Pricing Service is running', timestamp: new Date().toISOString() });
});

// Calculate price
app.post('/calculate', (req, res) => {
  const { distance, duration, vehicleType } = req.body;
  
  if (!distance || !duration) {
    return res.status(400).json({ error: 'distance and duration are required' });
  }
  
  const vehicleMultiplier = pricingConfig.vehicleTypes[vehicleType || 'sedan']?.multiplier || 1.0;
  const surgeMultiplier = pricingConfig.surgePricing.enabled ? pricingConfig.surgePricing.multiplier : 1.0;
  
  const basePrice = pricingConfig.baseFare + 
                   (distance * pricingConfig.perKm) + 
                   (duration * pricingConfig.perMinute);
  
  const totalPrice = basePrice * vehicleMultiplier * surgeMultiplier;
  
  res.json({
    basePrice: parseFloat(basePrice.toFixed(2)),
    vehicleMultiplier,
    surgeMultiplier,
    totalPrice: parseFloat(totalPrice.toFixed(2)),
    currency: 'USD',
    breakdown: {
      baseFare: pricingConfig.baseFare,
      distanceCharge: parseFloat((distance * pricingConfig.perKm).toFixed(2)),
      durationCharge: parseFloat((duration * pricingConfig.perMinute).toFixed(2))
    }
  });
});

// Get pricing config
app.get('/config', (req, res) => {
  res.json({ config: pricingConfig });
});

// Update surge pricing
app.post('/surge', (req, res) => {
  const { enabled, multiplier } = req.body;
  
  if (enabled !== undefined) {
    pricingConfig.surgePricing.enabled = enabled;
  }
  
  if (multiplier !== undefined) {
    pricingConfig.surgePricing.multiplier = multiplier;
  }
  
  res.json({ message: 'Surge pricing updated', surgePricing: pricingConfig.surgePricing });
});

// Estimate price by coordinates
app.post('/estimate', (req, res) => {
  const { pickupLat, pickupLng, dropoffLat, dropoffLng, vehicleType } = req.body;
  
  if (!pickupLat || !pickupLng || !dropoffLat || !dropoffLng) {
    return res.status(400).json({ error: 'All coordinates are required' });
  }
  
  // Simple distance calculation (Haversine formula simulation)
  const estimatedDistance = Math.sqrt(
    Math.pow(dropoffLat - pickupLat, 2) + Math.pow(dropoffLng - pickupLng, 2)
  ) * 111; // rough km conversion
  
  const estimatedDuration = estimatedDistance / 0.5; // assuming 30 km/h average speed
  
  const vehicleMultiplier = pricingConfig.vehicleTypes[vehicleType || 'sedan']?.multiplier || 1.0;
  const surgeMultiplier = pricingConfig.surgePricing.enabled ? pricingConfig.surgePricing.multiplier : 1.0;
  
  const basePrice = pricingConfig.baseFare + 
                   (estimatedDistance * pricingConfig.perKm) + 
                   (estimatedDuration * pricingConfig.perMinute);
  
  const totalPrice = basePrice * vehicleMultiplier * surgeMultiplier;
  
  res.json({
    estimatedDistance: parseFloat(estimatedDistance.toFixed(2)),
    estimatedDuration: parseFloat(estimatedDuration.toFixed(2)),
    estimatedPrice: parseFloat(totalPrice.toFixed(2)),
    currency: 'USD'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Pricing Service running on port ${PORT}`);
});
