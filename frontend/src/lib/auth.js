const TOKEN_KEY = 'car_booking_access_token';
const REFRESH_TOKEN_KEY = 'car_booking_refresh_token';
const USER_KEY = 'car_booking_user';

export const authStorage = {
  getAccessToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  
  setAccessToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  
  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  
  setRefreshToken(token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  
  getUser() {
    const user = localStorage.getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  },
  
  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  
  clearAll() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  
  hasToken() {
    return !!this.getAccessToken();
  }
};

export const bookingStorage = {
  setLastBookingId(id) {
    localStorage.setItem('last_booking_id', id);
  },
  
  getLastBookingId() {
    return localStorage.getItem('last_booking_id');
  },
  
  setLastRideId(id) {
    localStorage.setItem('last_ride_id', id);
  },
  
  getLastRideId() {
    return localStorage.getItem('last_ride_id');
  }
};
