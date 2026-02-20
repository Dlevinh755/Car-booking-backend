import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverBookingApi } from './driverBookingApi';
import toast from 'react-hot-toast';

export const useDriverBookings = (options = {}) => {
  return useQuery({
    queryKey: ['driver-bookings'],
    queryFn: driverBookingApi.getMyBookings,
    refetchInterval: options.refetchInterval || 5000, // Auto refresh every 5s
    ...options
  });
};

export const useAcceptBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: driverBookingApi.acceptBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-bookings'] });
      toast.success('Đã chấp nhận chuyến đi!');
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Không thể chấp nhận chuyến';
      toast.error(message);
    }
  });
};

export const useRejectBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ bookingId, reason }) => driverBookingApi.rejectBooking(bookingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-bookings'] });
      toast.success('Đã từ chối chuyến đi');
    },
    onError: (error) => {
      const message = error.response?.data?.error || 'Không thể từ chối chuyến';
      toast.error(message);
    }
  });
};
