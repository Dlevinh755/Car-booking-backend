import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bookingCreateSchema } from '../lib/validators';
import { useCreateBooking } from '../features/booking/bookingHooks';
import { bookingStorage } from '../lib/auth';
import { FormField, Input, TextArea, Button } from '../components/FormField';
import { StatusBadge } from '../components/StatusBadge';

export const BookingCreate = () => {
  const navigate = useNavigate();
  const createBookingMutation = useCreateBooking();
  const [createdBooking, setCreatedBooking] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(bookingCreateSchema),
    defaultValues: {
      pickupLat: '10.762622',
      pickupLng: '106.660172',
      pickupAddress: '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
      dropoffLat: '10.772622',
      dropoffLng: '106.680172',
      dropoffAddress: '456 Đường Lê Lợi, Quận 1, TP.HCM',
    }
  });

  const onSubmit = async (data) => {
    try {
      const result = await createBookingMutation.mutateAsync(data);
      console.log('📥 Booking result:', result);
      
      // The result contains { message, booking, driver }
      // Merge booking and driver for easier access
      const bookingWithDriver = {
        ...result.booking,
        driver: result.driver,
        ride: result.ride
      };
      
      setCreatedBooking(bookingWithDriver);
      
      // Save to localStorage for dashboard
      if (result.booking?.id) {
        bookingStorage.setLastBookingId(result.booking.id);
      }
      if (result.ride?.id) {
        bookingStorage.setLastRideId(result.ride.id);
      }
    } catch (error) {
      console.error('Create booking error:', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tạo Booking Mới</h1>
        <p className="text-gray-600">Nhập thông tin điểm đón và điểm đến</p>
      </div>

      {createdBooking ? (
        <div className="space-y-6">
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="h-6 w-6 text-green-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-green-900">Booking đã được tạo thành công!</h3>
                <p className="text-sm text-green-700 mt-1">
                  {createdBooking.status === 'requested' && 'Booking của bạn đang chờ được xử lý.'}
                  {createdBooking.status === 'searching' && 'Hệ thống đang tìm tài xế cho bạn...'}
                  {createdBooking.status === 'assigned' && createdBooking.driver && 
                    `Đã tìm thấy tài xế ${createdBooking.driver.fullName}! Tài xế cách bạn ${createdBooking.driver.distance?.km || 'N/A'} km.`
                  }
                  {createdBooking.status === 'assigned' && !createdBooking.driver && 
                    'Đã tìm thấy tài xế!'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin Booking</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-gray-600">Booking ID</span>
                <span className="font-semibold text-gray-900">#{createdBooking.id}</span>
              </div>

              <div className="flex justify-between items-center pb-3 border-b">
                <span className="text-sm text-gray-600">Trạng thái</span>
                <StatusBadge status={createdBooking.status} />
              </div>

              {createdBooking.estimatedFareAmount && (
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Giá ước tính</span>
                  <span className="text-lg font-bold text-primary-600">
                    {createdBooking.estimatedFareAmount.toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              )}

              {createdBooking.ride && (
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-sm text-gray-600">Ride ID</span>
                  <span className="font-semibold text-gray-900">#{createdBooking.ride.id}</span>
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={() => navigate(`/booking/${createdBooking.id}`)}
                variant="primary"
              >
                Xem chi tiết Booking
              </Button>
              
              {createdBooking.ride?.id && (
                <Button
                  onClick={() => navigate(`/ride/${createdBooking.ride.id}`)}
                  variant="outline"
                >
                  Xem chi tiết Ride
                </Button>
              )}
            </div>
          </div>

          {/* Driver Information */}
          {createdBooking.driver && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin Tài xế</h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                    <svg className="h-8 w-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{createdBooking.driver.fullName}</h3>
                    {createdBooking.driver.rating && (
                      <div className="flex items-center mt-1">
                        <div className="flex text-yellow-400">
                          {[...Array(5)].map((_, i) => (
                            <svg 
                              key={i} 
                              className={`h-4 w-4 ${i < Math.floor(parseFloat(createdBooking.driver.rating)) ? 'fill-current' : 'fill-gray-300'}`} 
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <span className="ml-2 text-sm text-gray-600">{parseFloat(createdBooking.driver.rating).toFixed(1)}/5</span>
                      </div>
                    )}
                  </div>
                </div>

                {createdBooking.driver.distance && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>
                      Cách bạn <strong>{createdBooking.driver.distance.km} km</strong>
                      {createdBooking.driver.distance.meters && ` (${createdBooking.driver.distance.meters}m)`}
                    </span>
                  </div>
                )}

                {createdBooking.driver.vehicle && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    <span>
                      Xe: <strong>{createdBooking.driver.vehicle.plateNumber}</strong>
                      {(createdBooking.driver.vehicle.make || createdBooking.driver.vehicle.model) && (
                        <span className="text-gray-500">
                          {' '}({createdBooking.driver.vehicle.make} {createdBooking.driver.vehicle.model})
                        </span>
                      )}
                    </span>
                  </div>
                )}

                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    ✓ Tài xế đã được phân công và sẽ sớm liên hệ với bạn!
                  </p>
                </div>
              </div>
            </div>
          )}

          {!createdBooking.driver && createdBooking.assignedDriverId && (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Thông tin Tài xế</h2>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm text-gray-600">
                  Tài xế ID: #{createdBooking.assignedDriverId}
                </p>
              </div>
            </div>
          )}

          {!createdBooking.driver && !createdBooking.assignedDriverId && (
            <div className="bg-white shadow rounded-lg p-6">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⏳ Hiện chưa có tài xế khả dụng. Hệ thống sẽ tự động tìm kiếm và phân công tài xế sớm nhất.
                </p>
              </div>
            </div>
          )}

          <div className="bg-white shadow rounded-lg p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={() => navigate(`/booking/${createdBooking.id}`)}
                variant="primary"
              >
                Xem chi tiết Booking
              </Button>
              
              {createdBooking.ride?.id && (
                <Button
                  onClick={() => navigate(`/ride/${createdBooking.ride.id}`)}
                  variant="outline"
                >
                  Xem chi tiết Ride
                </Button>
              )}
            </div>
          </div>

          <Button
            onClick={() => {
              setCreatedBooking(null);
            }}
            variant="secondary"
            className="w-full"
          >
            Tạo Booking mới
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white shadow rounded-lg p-6">
          {/* Pickup Location */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Điểm đón</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Vĩ độ (Latitude)"
                error={errors.pickupLat?.message}
                required
                helperText="VD: 10.762622"
              >
                <Input
                  {...register('pickupLat')}
                  type="text"
                  placeholder="10.762622"
                  error={errors.pickupLat}
                />
              </FormField>

              <FormField
                label="Kinh độ (Longitude)"
                error={errors.pickupLng?.message}
                required
                helperText="VD: 106.660172"
              >
                <Input
                  {...register('pickupLng')}
                  type="text"
                  placeholder="106.660172"
                  error={errors.pickupLng}
                />
              </FormField>
            </div>

            <FormField
              label="Địa chỉ điểm đón"
              error={errors.pickupAddress?.message}
              required
            >
              <Input
                {...register('pickupAddress')}
                type="text"
                placeholder="123 Đường Nguyễn Huệ, Quận 1, TP.HCM"
                error={errors.pickupAddress}
              />
            </FormField>
          </div>

          {/* Dropoff Location */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Điểm đến</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Vĩ độ (Latitude)"
                error={errors.dropoffLat?.message}
                required
                helperText="VD: 10.772622"
              >
                <Input
                  {...register('dropoffLat')}
                  type="text"
                  placeholder="10.772622"
                  error={errors.dropoffLat}
                />
              </FormField>

              <FormField
                label="Kinh độ (Longitude)"
                error={errors.dropoffLng?.message}
                required
                helperText="VD: 106.680172"
              >
                <Input
                  {...register('dropoffLng')}
                  type="text"
                  placeholder="106.680172"
                  error={errors.dropoffLng}
                />
              </FormField>
            </div>

            <FormField
              label="Địa chỉ điểm đến"
              error={errors.dropoffAddress?.message}
              required
            >
              <Input
                {...register('dropoffAddress')}
                type="text"
                placeholder="456 Đường Lê Lợi, Quận 1, TP.HCM"
                error={errors.dropoffAddress}
              />
            </FormField>
          </div>

          {/* Note */}
          <FormField
            label="Ghi chú"
            error={errors.note?.message}
            helperText="Không bắt buộc"
          >
            <TextArea
              {...register('note')}
              rows={3}
              placeholder="Thêm ghi chú cho tài xế..."
              error={errors.note}
            />
          </FormField>

          <div className="mt-6">
            <Button
              type="submit"
              className="w-full"
              isLoading={createBookingMutation.isPending}
            >
              Tạo Booking
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
