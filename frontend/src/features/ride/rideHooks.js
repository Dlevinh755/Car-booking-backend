import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rideApi } from './rideApi';
import toast from 'react-hot-toast';

export const useRide = (rideId, options = {}) => {
  return useQuery({
    queryKey: ['ride', rideId],
    queryFn: () => rideApi.getRide(rideId),
    enabled: !!rideId,
    refetchInterval: options.refetchInterval || false,
    ...options
  });
};

export const useUpdateRideStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ rideId, status }) => rideApi.updateRideStatus(rideId, status),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ride', variables.rideId] });
      toast.success('Trạng thái ride đã được cập nhật');
    },
    onError: (error) => {
      const message = error.response?.data?.message || 'Không thể cập nhật trạng thái';
      toast.error(message);
    }
  });
};

export const useRideEvents = (rideId) => {
  return useQuery({
    queryKey: ['ride', rideId, 'events'],
    queryFn: () => rideApi.getRideEvents(rideId),
    enabled: !!rideId
  });
};

export const useUserRides = (userId) => {
  return useQuery({
    queryKey: ['rides', 'user', userId],
    queryFn: () => rideApi.getRidesByUser(userId),
    enabled: !!userId
  });
};

export const useDriverRides = (driverId) => {
  return useQuery({
    queryKey: ['rides', 'driver', driverId],
    queryFn: () => rideApi.getRidesByDriver(driverId),
    enabled: !!driverId
  });
};
