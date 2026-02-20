import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../features/booking/bookingHooks';
import { useRide } from '../features/ride/rideHooks';
import { bookingStorage } from '../lib/auth';
import { StatusBadge } from '../components/StatusBadge';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';

export const Dashboard = () => {
  const { user } = useAuth();
  const lastBookingId = bookingStorage.getLastBookingId();
  const lastRideId = bookingStorage.getLastRideId();

  // Redirect drivers to driver panel
  if (user?.role === 'driver') {
    return <Navigate to="/driver" replace />;
  }

  const { data: booking, isLoading: bookingLoading, error: bookingError } = useBooking(
    lastBookingId,
    { enabled: !!lastBookingId }
  );

  const { data: ride, isLoading: rideLoading, error: rideError } = useRide(
    lastRideId,
    { enabled: !!lastRideId }
  );

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Xin chào, {user?.fullName}!
        </h1>
        <p className="text-gray-600">Chào mừng bạn đến với hệ thống đặt xe</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
          <div className="space-y-3">
            <Link
              to="/booking/create"
              className="block w-full text-center px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
            >
              Tạo Booking Mới
            </Link>
            <Link
              to="/driver"
              className="block w-full text-center px-4 py-3 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Driver Panel
            </Link>
          </div>
        </div>

        {/* Latest Booking */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Booking gần nhất</h2>
          {!lastBookingId ? (
            <p className="text-gray-500 text-sm">Chưa có booking nào</p>
          ) : bookingLoading ? (
            <Loading text="Đang tải..." />
          ) : bookingError ? (
            <ErrorState message="Không thể tải booking" />
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-900">Booking #{booking.id}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(booking.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
              
              {booking.estimatedFareAmount && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-gray-600">
                    Giá ước tính: <span className="font-semibold text-gray-900">
                      {booking.estimatedFareAmount.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </p>
                </div>
              )}
              
              <Link
                to={`/booking/${booking.id}`}
                className="block text-center w-full px-3 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
              >
                Xem chi tiết
              </Link>
            </div>
          )}
        </div>

        {/* Latest Ride */}
        <div className="bg-white shadow rounded-lg p-6 md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Ride gần nhất</h2>
          {!lastRideId ? (
            <p className="text-gray-500 text-sm">Chưa có ride nào</p>
          ) : rideLoading ? (
            <Loading text="Đang tải..." />
          ) : rideError ? (
            <ErrorState message="Không thể tải ride" />
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-900">Ride #{ride.id}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(ride.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <StatusBadge status={ride.status} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
                {ride.distanceMeters && (
                  <div>
                    <p className="text-xs text-gray-500">Khoảng cách</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {(ride.distanceMeters / 1000).toFixed(2)} km
                    </p>
                  </div>
                )}
                
                {ride.durationSeconds && (
                  <div>
                    <p className="text-xs text-gray-500">Thời gian</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {Math.floor(ride.durationSeconds / 60)} phút
                    </p>
                  </div>
                )}
                
                {ride.finalFareAmount && (
                  <div>
                    <p className="text-xs text-gray-500">Tổng cước</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {ride.finalFareAmount.toLocaleString('vi-VN')} VNĐ
                    </p>
                  </div>
                )}
              </div>
              
              <Link
                to={`/ride/${ride.id}`}
                className="block text-center w-full px-3 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm font-medium"
              >
                Xem chi tiết
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Hướng dẫn sử dụng</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Nhấn "Tạo Booking Mới" để đặt xe</li>
          <li>Nhập tọa độ (lat/lng) và địa chỉ cho điểm đón và điểm đến</li>
          <li>Hệ thống sẽ tự động tìm tài xế gần nhất</li>
          <li>Theo dõi trạng thái ride trong trang chi tiết</li>
          <li>Thanh toán qua VNPay khi ride hoàn thành</li>
        </ul>
      </div>
    </div>
  );
};
