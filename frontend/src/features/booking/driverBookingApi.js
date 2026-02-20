import api from '../../lib/api';
import { authStorage } from '../../lib/auth';

export const driverBookingApi = {
  async getMyBookings() {
    const user = authStorage.getUser();
    if (!user || !user.id) {
      throw new Error('User not authenticated');
    }
    
    const response = await api.get(`/api/bookings/driver/${user.id}`);
    return response.data;
  },

  async acceptBooking(bookingId) {
    const response = await api.post(`/api/bookings/${bookingId}/accept`);
    return response.data;
  },

  async rejectBooking(bookingId, reason) {
    const response = await api.post(`/api/bookings/${bookingId}/reject`, { reason });
    return response.data;
  }
};
