import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { rideStatusUpdateSchema } from '../lib/validators';
import { useUpdateDriverPresence } from '../features/driver/driverHooks';
import { useUpdateRideStatus } from '../features/ride/rideHooks';
import { useDriverBookings, useAcceptBooking, useRejectBooking } from '../features/booking/driverBookingHooks';
import { FormField, Input, Select, Button } from '../components/FormField';
import { StatusBadge } from '../components/StatusBadge';

export const DriverPanel = () => {
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState({ lat: '', lng: '' });
  const [lastUpdatedRide, setLastUpdatedRide] = useState(null);

  const updatePresenceMutation = useUpdateDriverPresence();
  const updateRideStatusMutation = useUpdateRideStatus();
  
  // Driver bookings
  const { data: bookingsData, isLoading: loadingBookings } = useDriverBookings();
  const acceptBookingMutation = useAcceptBooking();
  const rejectBookingMutation = useRejectBooking();

  const pendingBookings = bookingsData?.bookings?.filter(b => b.status === 'assigned') || [];

  const {
    register: registerRide,
    handleSubmit: handleSubmitRide,
    formState: { errors: rideErrors },
    reset: resetRide
  } = useForm({
    resolver: zodResolver(rideStatusUpdateSchema)
  });

  const handleToggleOnline = async () => {
    const newStatus = !isOnline;
    
    try {
      await updatePresenceMutation.mutateAsync({
        isOnline: newStatus,
        lat: currentLocation.lat ? parseFloat(currentLocation.lat) : undefined,
        lng: currentLocation.lng ? parseFloat(currentLocation.lng) : undefined
      });
      setIsOnline(newStatus);
    } catch (error) {
      console.error('Update presence error:', error);
    }
  };

  const onSubmitRideStatus = async (data) => {
    try {
      const result = await updateRideStatusMutation.mutateAsync({
        rideId: data.rideId,
        status: data.status
      });
      
      setLastUpdatedRide({
        id: data.rideId,
        status: data.status,
        updatedAt: new Date()
      });
      
      resetRide();
    } catch (error) {
      console.error('Update ride status error:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Driver Panel</h1>
        <p className="text-gray-600">Quản lý trạng thái tài xế và cập nhật chuyến đi</p>
      </div>

      {/* Driver Presence */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Trạng thái tài xế</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">Trạng thái hiện tại</p>
              <p className="text-sm text-gray-600">
                {isOnline ? 'Đang online - Sẵn sàng nhận chuyến' : 'Offline - Không nhận chuyến'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={isOnline ? 'in_progress' : 'cancelled'} />
              <Button
                onClick={handleToggleOnline}
                variant={isOnline ? 'danger' : 'primary'}
                isLoading={updatePresenceMutation.isPending}
              >
                {isOnline ? 'Đặt Offline' : 'Đặt Online'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              label="Vĩ độ hiện tại (Latitude)"
              helperText="Tùy chọn - vị trí hiện tại của bạn"
            >
              <Input
                type="text"
                placeholder="10.762622"
                value={currentLocation.lat}
                onChange={(e) => setCurrentLocation(prev => ({ ...prev, lat: e.target.value }))}
              />
            </FormField>

            <FormField
              label="Kinh độ hiện tại (Longitude)"
              helperText="Tùy chọn - vị trí hiện tại của bạn"
            >
              <Input
                type="text"
                placeholder="106.660172"
                value={currentLocation.lng}
                onChange={(e) => setCurrentLocation(prev => ({ ...prev, lng: e.target.value }))}
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* Pending Bookings */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Chuyến đi đang chờ ({pendingBookings.length})</h2>
        
        {loadingBookings ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Đang tải...</p>
          </div>
        ) : pendingBookings.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Không có chuyến đi nào đang chờ</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <div key={booking.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Điểm đón</p>
                    <p className="text-sm text-gray-900">
                      {booking.pickup_address || `${booking.pickup_lat}, ${booking.pickup_lng}`}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Điểm đến</p>
                    <p className="text-sm text-gray-900">
                      {booking.dropoff_address || `${booking.dropoff_lat}, ${booking.dropoff_lng}`}
                    </p>
                  </div>
                </div>
                
                {booking.note && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700">Ghi chú</p>
                    <p className="text-sm text-gray-600">{booking.note}</p>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Mã booking: #{booking.id} • Trạng thái: {booking.status}
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => acceptBookingMutation.mutate(booking.id)}
                    disabled={acceptBookingMutation.isPending || rejectBookingMutation.isPending}
                    className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {acceptBookingMutation.isPending ? 'Đang xử lý...' : 'Chấp nhận'}
                  </button>
                  <button
                    type="button"
                    onClick={() => rejectBookingMutation.mutate({ bookingId: booking.id, reason: '' })}
                    disabled={acceptBookingMutation.isPending || rejectBookingMutation.isPending}
                    className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {rejectBookingMutation.isPending ? 'Đang xử lý...' : 'Từ chối'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Update Ride Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Cập nhật trạng thái chuyến đi</h2>
        
        <form onSubmit={handleSubmitRide(onSubmitRideStatus)} className="space-y-4">
          <FormField
            label="Ride ID"
            error={rideErrors.rideId?.message}
            required
          >
            <Input
              {...registerRide('rideId')}
              type="text"
              placeholder="Nhập ID của ride cần cập nhật"
              error={rideErrors.rideId}
            />
          </FormField>

          <FormField
            label="Trạng thái mới"
            error={rideErrors.status?.message}
            required
          >
            <Select
              {...registerRide('status')}
              error={rideErrors.status}
            >
              <option value="">-- Chọn trạng thái --</option>
              <option value="arrived">Đã đến điểm đón</option>
              <option value="picked_up">Đã đón khách</option>
              <option value="in_progress">Đang di chuyển</option>
              <option value="completed">Hoàn thành</option>
              <option value="cancelled">Hủy chuyến</option>
            </Select>
          </FormField>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              <strong>Lưu ý:</strong> Khi đặt trạng thái "Hoàn thành", hệ thống sẽ tự động tính toán 
              khoảng cách, thời gian và tổng cước phải thanh toán.
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            isLoading={updateRideStatusMutation.isPending}
          >
            Cập nhật trạng thái
          </Button>
        </form>

        {/* Last Update Info */}
        {lastUpdatedRide && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Cập nhật gần nhất</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <svg className="h-5 w-5 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-900">
                    Đã cập nhật Ride #{lastUpdatedRide.id}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Trạng thái: <StatusBadge status={lastUpdatedRide.status} />
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    {lastUpdatedRide.updatedAt.toLocaleString('vi-VN')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Hướng dẫn cho tài xế</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Đặt trạng thái Online để hệ thống có thể chỉ định chuyến đi cho bạn</li>
          <li>Cập nhật vị trí hiện tại để hệ thống tìm kiếm chính xác hơn</li>
          <li>Khi nhận được chuyến đi mới, cập nhật trạng thái theo tiến trình:
            <ul className="ml-6 mt-1 space-y-1">
              <li>→ <strong>Arrived</strong>: Khi đến điểm đón</li>
              <li>→ <strong>Picked Up</strong>: Khi đã đón khách lên xe</li>
              <li>→ <strong>In Progress</strong>: Khi đang di chuyển đến điểm đến</li>
              <li>→ <strong>Completed</strong>: Khi đến nơi và khách xuống xe</li>
            </ul>
          </li>
          <li>Chuyến đi Completed sẽ tự động tính cước - nhắc khách thanh toán</li>
        </ul>
      </div>
    </div>
  );
};
