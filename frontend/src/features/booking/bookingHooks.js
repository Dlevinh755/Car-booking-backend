import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from './bookingApi';
import toast from 'react-hot-toast';

export const useCreateBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bookingApi.createBooking,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking đã được tạo thành công!');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Không thể tạo booking';
      toast.error(message);
    }
  });
};

export const useBooking = (bookingId, options = {}) => {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingApi.getBooking(bookingId),
    enabled: !!bookingId,
    refetchInterval: options.refetchInterval || false,
    ...options
  });
};

export const useCancelBooking = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: bookingApi.cancelBooking,
    onSuccess: (data, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      toast.success('Booking đã được hủy');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Không thể hủy booking';
      toast.error(message);
    }
  });
};

export const useUserBookings = (userId) => {
  return useQuery({
    queryKey: ['bookings', 'user', userId],
    queryFn: () => bookingApi.getBookingsByUser(userId),
    enabled: !!userId
  });
};
