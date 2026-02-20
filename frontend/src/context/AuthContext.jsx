import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';
import { authStorage } from '../lib/auth';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load user on mount
  useEffect(() => {
    initAuth();
  }, []);

  const initAuth = async () => {
    try {
      if (authStorage.hasToken()) {
        const cachedUser = authStorage.getUser();
        if (cachedUser) {
          setUser(cachedUser);
          setIsAuthenticated(true);
        }
        
        // Fetch fresh user data
        try {
          const response = await api.get('/api/auth/me');
          setUser(response.data);
          authStorage.setUser(response.data);
          setIsAuthenticated(true);
        } catch (apiError) {
          // If 401 Unauthorized, clear auth (token expired/invalid)
          if (apiError.response?.status === 401) {
            console.log('Token expired or invalid, logging out');
            authStorage.clearAll();
            setUser(null);
            setIsAuthenticated(false);
          } else {
            // For other errors (network issues, etc.), keep using cached user
            console.warn('Could not refresh user data, using cached:', apiError.message);
            // User already set from cache above
          }
        }
      }
    } catch (error) {
      console.error('Init auth failed:', error);
      authStorage.clearAll();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (identifier, password) => {
    try {
      const response = await api.post('/api/auth/login', { identifier, password });
      const { accessToken, refreshToken, user: userData } = response.data;
      
      authStorage.setAccessToken(accessToken);
      authStorage.setRefreshToken(refreshToken);
      authStorage.setUser(userData);
      
      setUser(userData);
      setIsAuthenticated(true);
      
      toast.success('Đăng nhập thành công!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Đăng nhập thất bại';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const register = async (data) => {
    try {
      console.log('=== AUTH REGISTER ===');
      
      // Build request payload, omitting email if empty
      const payload = {
        fullName: data.fullName,
        phone: data.phone,
        password: data.password
      };
      
      // Only include email if it has a value
      if (data.email && data.email.trim() !== '') {
        payload.email = data.email;
      }
      
      console.log('Sending data:', {
        ...payload,
        password: '[HIDDEN]'
      });
      
      const response = await api.post('/api/auth/register', payload);
      
      console.log('Register response:', response.data);
      toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
      return { success: true };
    } catch (error) {
      console.log('=== REGISTER ERROR ===');
      console.log('Error response:', error.response);
      console.log('Error data:', error.response?.data);
      console.log('Error status:', error.response?.status);
      
      const message = error.response?.data?.message || 'Đăng ký thất bại';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const registerDriver = async (data) => {
    try {
      console.log('=== DRIVER REGISTER ===');
      
      // Build auth payload
      const authPayload = {
        fullName: data.fullName,
        phone: data.phone,
        password: data.password,
        role: 'driver' // Set role as driver
      };
      
      // Only include email if it has a value
      if (data.email && data.email.trim() !== '') {
        authPayload.email = data.email;
      }
      
      console.log('Sending auth data:', {
        ...authPayload,
        password: '[HIDDEN]'
      });
      
      // Register auth account
      const authResponse = await api.post('/api/auth/register', authPayload);
      console.log('Auth register response:', authResponse.data);
      
      // Create driver profile
      const driverPayload = {
        userId: authResponse.data.data.userId,
        fullName: data.fullName,
        phone: data.phone,
        vehicleType: data.vehicleType,
        plateNumber: data.licensePlate, // Map licensePlate to plateNumber
        licenseNumber: data.licenseNumber
      };
      
      console.log('Creating driver profile:', driverPayload);
      const driverResponse = await api.post('/api/drivers/register', driverPayload);
      console.log('Driver profile created:', driverResponse.data);
      
      toast.success('Đăng ký tài xế thành công! Vui lòng chờ phê duyệt.');
      return { success: true };
    } catch (error) {
      console.log('=== DRIVER REGISTER ERROR ===');
      console.log('Error response:', error.response);
      console.log('Error data:', error.response?.data);
      console.log('Error status:', error.response?.status);
      
      const message = error.response?.data?.message || 'Đăng ký tài xế thất bại';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    authStorage.clearAll();
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Đã đăng xuất');
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    registerDriver,
    logout,
    refreshUser: initAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
