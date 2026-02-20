import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driverApi } from './driverApi';
import toast from 'react-hot-toast';

export const useUpdateDriverPresence = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: driverApi.updatePresence,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver', 'profile'] });
      toast.success('Trạng thái tài xế đã được cập nhật');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Không thể cập nhật trạng thái';
      toast.error(message);
    }
  });
};

export const useDriverProfile = () => {
  return useQuery({
    queryKey: ['driver', 'profile'],
    queryFn: driverApi.getDriverProfile,
    retry: false
  });
};

export const useNearbyDrivers = (lat, lng, radiusKm = 5) => {
  return useQuery({
    queryKey: ['drivers', 'nearby', lat, lng, radiusKm],
    queryFn: () => driverApi.getNearbyDrivers(lat, lng, radiusKm),
    enabled: !!(lat && lng)
  });
};
