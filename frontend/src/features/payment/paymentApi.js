import api from '../../lib/api';

export const paymentApi = {
  async createVNPayPayment(rideId) {
    const response = await api.post('/api/payments/vnpay/create', { rideId });
    return response.data;
  },

  async getPayment(paymentId) {
    const response = await api.get(`/api/payments/${paymentId}`);
    return response.data;
  },

  async getPaymentByRide(rideId) {
    const response = await api.get(`/api/payments/ride/${rideId}`);
    return response.data;
  }
};
