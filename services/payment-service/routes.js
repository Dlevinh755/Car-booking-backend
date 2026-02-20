const express = require('express');
const router = express.Router();
const vnpayController = require('./controllers/vnpayController');

// VNPay endpoints
router.post('/payments/vnpay/create', vnpayController.createPaymentUrl);
router.get('/payments/vnpay/return', vnpayController.handleReturn);
router.get('/payments/vnpay/ipn', vnpayController.handleIpn);

// Payment retrieval
router.get('/payments/:id', vnpayController.getPayment);
router.get('/payments/ride/:rideId', vnpayController.getPaymentByRide);

module.exports = router;
