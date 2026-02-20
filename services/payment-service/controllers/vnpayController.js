const crypto = require('crypto');
const querystring = require('querystring');
const paymentRepository = require('../repositories/paymentRepository');
const config = require('../../../../shared/config');

/**
 * Sort object by keys for VNPay hash
 * @param {Object} obj - Object to sort
 * @returns {Object} Sorted object
 */
function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  keys.forEach(key => {
    sorted[key] = obj[key];
  });
  return sorted;
}

/**
 * Create HMAC SHA512 hash for VNPay
 * @param {string} data - Data to hash
 * @param {string} secret - Secret key
 * @returns {string} HMAC SHA512 hash
 */
function createHmacSha512(data, secret) {
  return crypto.createHmac('sha512', secret).update(data).digest('hex');
}

/**
 * Create VNPay payment URL
 */
async function createPaymentUrl(req, res, next) {
  try {
    const { rideId, amount, returnUrl } = req.body;

    // Validate required fields
    if (!rideId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: { rideId, amount }
      });
    }

    // Validate amount
    const paymentAmount = parseInt(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        error: 'Invalid amount',
        amount
      });
    }

    // Create payment record
    const payment = await paymentRepository.createPayment({
      rideId,
      amount: paymentAmount,
      provider: 'vnpay'
    });

    // VNPay configuration
    const vnpUrl = config.get('VNP_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const vnpTmnCode = config.get('VNP_TMN_CODE') || 'YOUR_TMN_CODE';
    const vnpHashSecret = config.get('VNP_HASH_SECRET') || 'YOUR_HASH_SECRET';
    const vnpReturnUrl = returnUrl || config.get('VNP_RETURN_URL') || 'http://localhost:3000/payment/vnpay/return';

    // Get client IP
    const ipAddr = req.headers['x-forwarded-for'] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress ||
                   '127.0.0.1';

    // Create date
    const createDate = new Date();
    const vnpCreateDate = 
      createDate.getFullYear() +
      String(createDate.getMonth() + 1).padStart(2, '0') +
      String(createDate.getDate()).padStart(2, '0') +
      String(createDate.getHours()).padStart(2, '0') +
      String(createDate.getMinutes()).padStart(2, '0') +
      String(createDate.getSeconds()).padStart(2, '0');

    // Build VNPay params
    let vnpParams = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: vnpTmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: payment.id, // Use our payment ID as transaction reference
      vnp_OrderInfo: `Payment for ride ${rideId}`,
      vnp_OrderType: 'other',
      vnp_Amount: paymentAmount * 100, // VNPay requires amount in smallest currency unit (VND * 100)
      vnp_ReturnUrl: vnpReturnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: vnpCreateDate
    };

    // Sort params alphabetically
    vnpParams = sortObject(vnpParams);

    // Create sign data
    const signData = querystring.stringify(vnpParams, { encode: false });
    const secureHash = createHmacSha512(signData, vnpHashSecret);

    vnpParams['vnp_SecureHash'] = secureHash;

    // Build final URL
    const paymentUrl = vnpUrl + '?' + querystring.stringify(vnpParams, { encode: false });

    console.log(`✓ VNPay payment URL created for payment ${payment.id}, amount: ${paymentAmount} VND`);

    res.json({
      message: 'Payment URL created successfully',
      paymentId: payment.id,
      paymentUrl,
      amount: paymentAmount
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Handle VNPay return (redirect after payment)
 */
async function handleReturn(req, res, next) {
  try {
    const vnpParams = req.query;
    const secureHash = vnpParams['vnp_SecureHash'];

    // Remove hash params
    delete vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHashType'];

    // Sort params
    const sortedParams = sortObject(vnpParams);

    // Verify signature
    const vnpHashSecret = config.get('VNP_HASH_SECRET') || 'YOUR_HASH_SECRET';
    const signData = querystring.stringify(sortedParams, { encode: false });
    const checkHash = createHmacSha512(signData, vnpHashSecret);

    if (secureHash !== checkHash) {
      console.error('VNPay return: Invalid signature');
      return res.status(400).json({
        error: 'Invalid signature',
        code: 97
      });
    }

    // Get payment
    const paymentId = vnpParams['vnp_TxnRef'];
    const payment = await paymentRepository.getPaymentById(paymentId);

    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found',
        paymentId
      });
    }

    // Check response code
    const responseCode = vnpParams['vnp_ResponseCode'];
    const providerPaymentId = vnpParams['vnp_TransactionNo'];

    if (responseCode === '00') {
      // Payment successful
      await paymentRepository.updatePaymentStatus(paymentId, 'completed', providerPaymentId);
      
      console.log(`✓ Payment ${paymentId} completed successfully. VNPay TxnNo: ${providerPaymentId}`);

      res.json({
        message: 'Payment successful',
        paymentId,
        rideId: payment.rideId,
        amount: payment.amount,
        status: 'completed',
        providerPaymentId
      });
    } else {
      // Payment failed
      await paymentRepository.updatePaymentStatus(paymentId, 'failed', providerPaymentId);
      
      console.log(`✗ Payment ${paymentId} failed. Response code: ${responseCode}`);

      res.status(400).json({
        message: 'Payment failed',
        paymentId,
        responseCode,
        status: 'failed'
      });
    }
  } catch (error) {
    next(error);
  }
}

/**
 * Handle VNPay IPN (Instant Payment Notification)
 */
async function handleIpn(req, res, next) {
  try {
    const vnpParams = req.query;
    const secureHash = vnpParams['vnp_SecureHash'];

    // Remove hash params
    delete vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHashType'];

    // Sort params
    const sortedParams = sortObject(vnpParams);

    // Verify signature
    const vnpHashSecret = config.get('VNP_HASH_SECRET') || 'YOUR_HASH_SECRET';
    const signData = querystring.stringify(sortedParams, { encode: false });
    const checkHash = createHmacSha512(signData, vnpHashSecret);

    if (secureHash !== checkHash) {
      console.error('VNPay IPN: Invalid signature');
      return res.status(200).json({
        RspCode: '97',
        Message: 'Invalid signature'
      });
    }

    // Get payment
    const paymentId = vnpParams['vnp_TxnRef'];
    const payment = await paymentRepository.getPaymentById(paymentId);

    if (!payment) {
      console.error(`VNPay IPN: Payment not found: ${paymentId}`);
      return res.status(200).json({
        RspCode: '01',
        Message: 'Order not found'
      });
    }

    // Check amount
    const vnpAmount = parseInt(vnpParams['vnp_Amount']) / 100; // Convert back to VND
    if (vnpAmount !== payment.amount) {
      console.error(`VNPay IPN: Amount mismatch. Expected: ${payment.amount}, Received: ${vnpAmount}`);
      return res.status(200).json({
        RspCode: '04',
        Message: 'Invalid amount'
      });
    }

    // Check if payment is already processed
    if (payment.status === 'completed') {
      console.log(`VNPay IPN: Payment ${paymentId} already confirmed`);
      return res.status(200).json({
        RspCode: '02',
        Message: 'Order already confirmed'
      });
    }

    // Check response code
    const responseCode = vnpParams['vnp_ResponseCode'];
    const providerPaymentId = vnpParams['vnp_TransactionNo'];

    if (responseCode === '00') {
      // Payment successful
      await paymentRepository.updatePaymentStatus(paymentId, 'completed', providerPaymentId);
      
      console.log(`✓ VNPay IPN: Payment ${paymentId} confirmed. VNPay TxnNo: ${providerPaymentId}`);

      return res.status(200).json({
        RspCode: '00',
        Message: 'Confirm success'
      });
    } else {
      // Payment failed
      await paymentRepository.updatePaymentStatus(paymentId, 'failed', providerPaymentId);
      
      console.log(`✗ VNPay IPN: Payment ${paymentId} failed. Response code: ${responseCode}`);

      return res.status(200).json({
        RspCode: '00',
        Message: 'Confirm success'
      });
    }
  } catch (error) {
    console.error('VNPay IPN error:', error);
    return res.status(200).json({
      RspCode: '99',
      Message: 'Unknown error'
    });
  }
}

/**
 * Get payment by ID
 */
async function getPayment(req, res, next) {
  try {
    const { id } = req.params;

    const payment = await paymentRepository.getPaymentById(id);

    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found'
      });
    }

    res.json({
      payment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get payment by ride ID
 */
async function getPaymentByRide(req, res, next) {
  try {
    const { rideId } = req.params;

    const payment = await paymentRepository.getPaymentByRideId(rideId);

    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found for this ride'
      });
    }

    res.json({
      payment
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createPaymentUrl,
  handleReturn,
  handleIpn,
  getPayment,
  getPaymentByRide
};
