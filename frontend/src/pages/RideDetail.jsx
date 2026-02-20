import { useParams, useNavigate } from 'react-router-dom';
import { useRide } from '../features/ride/rideHooks';
import { usePaymentByRide, useCreateVNPayPayment } from '../features/payment/paymentHooks';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/FormField';

export const RideDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: ride, isLoading, error, refetch } = useRide(id, {
    refetchInterval: 3000 // Poll every 3 seconds
  });
  
  const { data: payment } = usePaymentByRide(id);
  const createPaymentMutation = useCreateVNPayPayment();

  const handlePayment = async () => {
    try {
      await createPaymentMutation.mutateAsync(id);
      // Will redirect to VNPay
    } catch (error) {
      console.error('Create payment error:', error);
    }
  };

  if (isLoading) {
    return <Loading text="Đang tải ride..." />;
  }

  if (error) {
    return <ErrorState message="Không thể tải thông tin ride" onRetry={refetch} />;
  }

  if (!ride) {
    return <ErrorState message="Không tìm thấy ride" />;
  }

  const isCompleted = ride.status === 'completed';
  const hasPayment = !!payment;
  const showPaymentButton = isCompleted && !hasPayment;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Ride #{ride.id}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Tạo lúc: {new Date(ride.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <StatusBadge status={ride.status} />
        </div>

        {/* Final Fare - Show prominently if completed */}
        {ride.finalFareAmount && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-green-900">Tổng cước phải thanh toán</span>
              <span className="text-2xl font-bold text-green-600">
                {ride.finalFareAmount.toLocaleString('vi-VN')} VNĐ
              </span>
            </div>
          </div>
        )}

        {/* Ride Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {ride.distanceMeters && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Khoảng cách</p>
              <p className="text-2xl font-bold text-gray-900">
                {(ride.distanceMeters / 1000).toFixed(2)}
              </p>
              <p className="text-xs text-gray-600">km</p>
            </div>
          )}

          {ride.durationSeconds && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Thời gian</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.floor(ride.durationSeconds / 60)}
              </p>
              <p className="text-xs text-gray-600">phút</p>
            </div>
          )}

          {ride.fareId && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Fare ID</p>
              <p className="text-sm font-mono text-gray-900 break-all">
                {ride.fareId.slice(0, 12)}...
              </p>
            </div>
          )}
        </div>

        {/* Ride Info */}
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Thông tin chuyến đi</h3>

          <div className="mb-3 pb-3 border-b">
            <p className="text-sm text-gray-600">Booking ID</p>
            <p className="font-mono text-sm text-gray-900">{ride.bookingId}</p>
          </div>

          <div className="mb-3 pb-3 border-b">
            <p className="text-sm text-gray-600">Tài xế</p>
            <p className="font-semibold text-gray-900">
              {ride.driver?.fullName || `Driver #${ride.driverId}`}
            </p>
            {ride.driver?.phone && (
              <p className="text-sm text-gray-600">{ride.driver.phone}</p>
            )}
          </div>

          <div className="mb-3 pb-3 border-b">
            <p className="text-sm text-gray-600 mb-1">Điểm đón</p>
            <p className="text-sm text-gray-900">{ride.pickupLocation?.addressText || 'N/A'}</p>
            {ride.pickupLocation && (
              <p className="text-xs text-gray-500">
                {ride.pickupLocation.lat}, {ride.pickupLocation.lng}
              </p>
            )}
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-1">Điểm đến</p>
            <p className="text-sm text-gray-900">{ride.dropoffLocation?.addressText || 'N/A'}</p>
            {ride.dropoffLocation && (
              <p className="text-xs text-gray-500">
                {ride.dropoffLocation.lat}, {ride.dropoffLocation.lng}
              </p>
            )}
          </div>
        </div>

        {/* Payment Section */}
        {isCompleted && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Thanh toán</h3>
            
            {hasPayment ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Đã thanh toán</p>
                    <p className="text-xs text-gray-600 mt-1">Payment ID: {payment.id}</p>
                  </div>
                  <StatusBadge status={payment.status} />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Chuyến đi đã hoàn thành. Vui lòng thanh toán qua VNPay.
                  </p>
                </div>
                <Button
                  onClick={handlePayment}
                  variant="primary"
                  className="w-full"
                  isLoading={createPaymentMutation.isPending}
                >
                  Thanh toán {ride.finalFareAmount?.toLocaleString('vi-VN')} VNĐ qua VNPay
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
          >
            Về Dashboard
          </Button>
          
          <Button
            onClick={() => navigate('/booking/create')}
            variant="secondary"
          >
            Tạo Booking mới
          </Button>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800 text-center">
          ⟳ Tự động cập nhật mỗi 3 giây
        </p>
      </div>
    </div>
  );
};
