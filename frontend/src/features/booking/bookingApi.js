import api from '../../lib/api';
import { authStorage } from '../../lib/auth';

export const bookingApi = {
  async createBooking(data) {
    // Get userId from stored user data
    const user = authStorage.getUser();
    console.log('🔍 Creating booking - User data:', user);
    
    if (!user || !user.id) {
      console.error('❌ User not authenticated or missing ID:', user);
      throw new Error('User not authenticated');
    }
    
    const payload = {
      userId: user.id,
      pickupLat: parseFloat(data.pickupLat),
      pickupLng: parseFloat(data.pickupLng),
      pickupAddress: data.pickupAddress,
      dropoffLat: parseFloat(data.dropoffLat),
      dropoffLng: parseFloat(data.dropoffLng),
      dropoffAddress: data.dropoffAddress,
      note: data.note || undefined
    };
    
    console.log('📤 Sending booking payload:', payload);
    
    const response = await api.post('/api/bookings', payload);
    console.log('✅ Booking created:', response.data);
    return response.data;
  },

  async getBooking(bookingId) {
    const response = await api.get(`/api/bookings/${bookingId}`);
    return response.data;
  },

  async cancelBooking(bookingId) {
    const response = await api.post(`/api/bookings/${bookingId}/cancel`);
    return response.data;
  },

  async getBookingsByUser(userId) {
    const response = await api.get(`/api/bookings/user/${userId}`);
    return response.data;
  }
};
