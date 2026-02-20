import { useQuery, useMutation } from '@tanstack/react-query';
import { paymentApi } from './paymentApi';
import toast from 'react-hot-toast';

export const useCreateVNPayPayment = () => {
  return useMutation({
    mutationFn: paymentApi.createVNPayPayment,
    onSuccess: (data) => {
      // Redirect to VNPay
      if (data.payUrl) {
        window.location.href = data.payUrl;
      }
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Không thể tạo thanh toán';
      toast.error(message);
    }
  });
};

export const usePayment = (paymentId) => {
  return useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => paymentApi.getPayment(paymentId),
    enabled: !!paymentId
  });
};

export const usePaymentByRide = (rideId) => {
  return useQuery({
    queryKey: ['payment', 'ride', rideId],
    queryFn: () => paymentApi.getPaymentByRide(rideId),
    enabled: !!rideId,
    retry: false // Don't retry if payment doesn't exist yet
  });
};
