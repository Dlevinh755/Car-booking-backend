import { z } from 'zod';

// Vietnamese phone number regex: starts with 0, 10-11 digits total
const phoneRegex = /^0\d{9,10}$/;

// Auth schemas
export const registerSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  phone: z.string()
    .min(10, 'Số điện thoại phải có ít nhất 10 số')
    .max(11, 'Số điện thoại tối đa 11 số')
    .regex(phoneRegex, 'Số điện thoại phải bắt đầu bằng 0 và chỉ chứa chữ số'),
  email: z.union([
    z.string().email('Email không hợp lệ'),
    z.literal('')
  ]).optional(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string().min(6, 'Vui lòng xác nhận mật khẩu')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword']
});

export const driverRegisterSchema = z.object({
  fullName: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  phone: z.string()
    .min(10, 'Số điện thoại phải có ít nhất 10 số')
    .max(11, 'Số điện thoại tối đa 11 số')
    .regex(phoneRegex, 'Số điện thoại phải bắt đầu bằng 0 và chỉ chứa chữ số'),
  email: z.union([
    z.string().email('Email không hợp lệ'),
    z.literal('')
  ]).optional(),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  confirmPassword: z.string().min(6, 'Vui lòng xác nhận mật khẩu'),
  vehicleType: z.string().min(1, 'Vui lòng chọn loại xe'),
  licensePlate: z.string().min(5, 'Biển số xe không hợp lệ'),
  licenseNumber: z.string().min(5, 'Số giấy phép lái xe không hợp lệ')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword']
});

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Vui lòng nhập số điện thoại hoặc email'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu')
});

// Location schema
export const locationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  addressText: z.string().min(1, 'Vui lòng nhập địa chỉ')
});

// Booking schema
export const bookingCreateSchema = z.object({
  pickupLat: z.string().min(1, 'Vui lòng nhập vĩ độ điểm đón'),
  pickupLng: z.string().min(1, 'Vui lòng nhập kinh độ điểm đón'),
  pickupAddress: z.string().min(1, 'Vui lòng nhập địa chỉ điểm đón'),
  dropoffLat: z.string().min(1, 'Vui lòng nhập vĩ độ điểm đến'),
  dropoffLng: z.string().min(1, 'Vui lòng nhập kinh độ điểm đến'),
  dropoffAddress: z.string().min(1, 'Vui lòng nhập địa chỉ điểm đến'),
  note: z.string().optional()
}).refine(data => {
  const pickupLat = parseFloat(data.pickupLat);
  const pickupLng = parseFloat(data.pickupLng);
  const dropoffLat = parseFloat(data.dropoffLat);
  const dropoffLng = parseFloat(data.dropoffLng);
  
  return !isNaN(pickupLat) && !isNaN(pickupLng) && 
         !isNaN(dropoffLat) && !isNaN(dropoffLng) &&
         pickupLat >= -90 && pickupLat <= 90 &&
         pickupLng >= -180 && pickupLng <= 180 &&
         dropoffLat >= -90 && dropoffLat <= 90 &&
         dropoffLng >= -180 && dropoffLng <= 180;
}, {
  message: 'Tọa độ không hợp lệ',
  path: ['pickupLat']
});

// Driver schema
export const driverPresenceSchema = z.object({
  isOnline: z.boolean(),
  lat: z.number().optional(),
  lng: z.number().optional()
});

export const rideStatusUpdateSchema = z.object({
  rideId: z.string().min(1, 'Vui lòng nhập ID chuyến đi'),
  status: z.enum(['arrived', 'picked_up', 'in_progress', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Trạng thái không hợp lệ' })
  })
});
