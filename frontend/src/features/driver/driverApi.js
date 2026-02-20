import api from '../../lib/api';

export const driverApi = {
  async updatePresence(data) {
    const response = await api.post('/api/drivers/presence', {
      isOnline: data.isOnline,
      lat: data.lat,
      lng: data.lng
    });
    return response.data;
  },

  async getDriverProfile() {
    const response = await api.get('/api/drivers/me');
    return response.data;
  },

  async getNearbyDrivers(lat, lng, radiusKm = 5) {
    const response = await api.get('/api/drivers/nearby', {
      params: { lat, lng, radiusKm }
    });
    return response.data;
  }
};
