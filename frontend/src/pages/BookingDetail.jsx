import { useParams, useNavigate } from 'react-router-dom';
import { useBooking, useCancelBooking } from '../features/booking/bookingHooks';
import { Loading } from '../components/Loading';
import { ErrorState } from '../components/ErrorState';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/FormField';

export const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: booking, isLoading, error, refetch } = useBooking(id, {
    refetchInterval: 3000 // Poll every 3 seconds
  });
  const cancelBookingMutation = useCancelBooking();

  const handleCancel = async () => {
    if (window.confirm('Bạn có chắc muốn hủy booking này?')) {
      try {
        await cancelBookingMutation.mutateAsync(id);
        refetch();
      } catch (error) {
        console.error('Cancel booking error:', error);
      }
    }
  };

  if (isLoading) {
    return <Loading text="Đang tải booking..." />;
  }

  if (error) {
    return <ErrorState message="Không thể tải thông tin booking" onRetry={refetch} />;
  }

  if (!booking) {
    return <ErrorState message="Không tìm thấy booking" />;
  }

  const canCancel = ['requested', 'searching', 'assigned'].includes(booking.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking #{booking.id}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Tạo lúc: {new Date(booking.createdAt).toLocaleString('vi-VN')}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>

        {/* Booking Info */}
        <div className="space-y-4">
          {booking.estimatedFareAmount && (
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-primary-900">Giá ước tính</span>
                <span className="text-2xl font-bold text-primary-600">
                  {booking.estimatedFareAmount.toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Thông tin chuyến đi</h3>
            
            {booking.assignedDriverId && (
              <div className="mb-3 pb-3 border-b">
                <p className="text-sm text-gray-600">Tài xế</p>
                <p className="font-semibold text-gray-900">
                  {booking.driver?.fullName || `Driver #${booking.assignedDriverId}`}
                </p>
                {booking.driver?.phone && (
                  <p className="text-sm text-gray-600">{booking.driver.phone}</p>
                )}
              </div>
            )}

            {booking.pricingQuoteId && (
              <div className="mb-3 pb-3 border-b">
                <p className="text-sm text-gray-600">Pricing Quote ID</p>
                <p className="font-mono text-sm text-gray-900">{booking.pricingQuoteId}</p>
              </div>
            )}

            <div className="mb-3 pb-3 border-b">
              <p className="text-sm text-gray-600 mb-1">Điểm đón</p>
              <p className="text-sm text-gray-900">{booking.pickupLocation?.addressText || 'N/A'}</p>
              {booking.pickupLocation && (
                <p className="text-xs text-gray-500">
                  {booking.pickupLocation.lat}, {booking.pickupLocation.lng}
                </p>
              )}
            </div>

            <div className="mb-3 pb-3 border-b">
              <p className="text-sm text-gray-600 mb-1">Điểm đến</p>
              <p className="text-sm text-gray-900">{booking.dropoffLocation?.addressText || 'N/A'}</p>
              {booking.dropoffLocation && (
                <p className="text-xs text-gray-500">
                  {booking.dropoffLocation.lat}, {booking.dropoffLocation.lng}
                </p>
              )}
            </div>

            {booking.note && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-1">Ghi chú</p>
                <p className="text-sm text-gray-900 italic">{booking.note}</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          {canCancel && (
            <Button
              onClick={handleCancel}
              variant="danger"
              isLoading={cancelBookingMutation.isPending}
            >
              Hủy Booking
            </Button>
          )}
          
          <Button
            onClick={() => navigate('/booking/create')}
            variant="secondary"
          >
            Tạo Booking mới
          </Button>

          <Button
            onClick={() => navigate('/dashboard')}
            variant="outline"
          >
            Về Dashboard
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
