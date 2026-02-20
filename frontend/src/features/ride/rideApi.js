import api from '../../lib/api';

export const rideApi = {
  async getRide(rideId) {
    const response = await api.get(`/api/rides/${rideId}`);
    return response.data;
  },

  async updateRideStatus(rideId, status) {
    const response = await api.post(`/api/rides/${rideId}/status`, { status });
    return response.data;
  },

  async getRideEvents(rideId) {
    const response = await api.get(`/api/rides/${rideId}/events`);
    return response.data;
  },

  async getRidesByUser(userId) {
    const response = await api.get(`/api/rides/user/${userId}`);
    return response.data;
  },

  async getRidesByDriver(driverId) {
    const response = await api.get(`/api/rides/driver/${driverId}`);
    return response.data;
  }
};
