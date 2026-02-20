import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { driverRegisterSchema } from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import { FormField, Input, Button, Select } from '../components/FormField';

export const DriverRegister = () => {
  const navigate = useNavigate();
  const { registerDriver } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(driverRegisterSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: '',
      vehicleType: '',
      licensePlate: '',
      licenseNumber: ''
    }
  });

  const onSubmit = async (data) => {
    console.log('=== DRIVER REGISTRATION ===');
    console.log('Form data:', data);
    
    if (!data || !data.fullName || !data.phone || !data.password || !data.licensePlate) {
      console.error('❌ Form data is incomplete!', data);
      alert('Lỗi: Dữ liệu form không đầy đủ. Vui lòng thử lại.');
      return;
    }
    
    setIsLoading(true);
    const result = await registerDriver(data);
    setIsLoading(false);

    if (result.success) {
      navigate('/login');
    }
  };
  
  const onError = (errors) => {
    console.log('=== FORM VALIDATION ERRORS ===');
    console.log('Errors:', errors);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng ký tài khoản Tài xế
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Đăng nhập ngay
            </Link>
            {' | '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
              Đăng ký làm khách hàng
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit, onError)}>
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
              Thông tin cá nhân
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Họ và tên"
                error={errors.fullName?.message}
                required
              >
                <Input
                  {...register('fullName')}
                  type="text"
                  placeholder="Nguyễn Văn A"
                  error={errors.fullName}
                />
              </FormField>

              <FormField
                label="Số điện thoại"
                error={errors.phone?.message}
                required
              >
                <Input
                  {...register('phone')}
                  type="text"
                  placeholder="VD: 0912345678 (10-11 số, bắt đầu bằng 0)"
                  error={errors.phone}
                />
              </FormField>
            </div>

            <FormField
              label="Email"
              error={errors.email?.message}
              helperText="Không bắt buộc"
            >
              <Input
                {...register('email')}
                type="email"
                placeholder="email@example.com"
                error={errors.email}
              />
            </FormField>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Mật khẩu"
                error={errors.password?.message}
                required
              >
                <Input
                  {...register('password')}
                  type="password"
                  placeholder="Nhập mật khẩu (tối thiểu 6 ký tự)"
                  error={errors.password}
                />
              </FormField>

              <FormField
                label="Xác nhận mật khẩu"
                error={errors.confirmPassword?.message}
                required
              >
                <Input
                  {...register('confirmPassword')}
                  type="password"
                  placeholder="Nhập lại mật khẩu"
                  error={errors.confirmPassword}
                />
              </FormField>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">
              Thông tin phương tiện
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                label="Loại xe"
                error={errors.vehicleType?.message}
                required
              >
                <Select
                  {...register('vehicleType')}
                  error={errors.vehicleType}
                >
                  <option value="">-- Chọn loại xe --</option>
                  <option value="4-seater">Xe 4 chỗ</option>
                  <option value="7-seater">Xe 7 chỗ</option>
                  <option value="bike">Xe máy</option>
                </Select>
              </FormField>

              <FormField
                label="Biển số xe"
                error={errors.licensePlate?.message}
                required
              >
                <Input
                  {...register('licensePlate')}
                  type="text"
                  placeholder="VD: 30A-12345"
                  error={errors.licensePlate}
                />
              </FormField>
            </div>

            <FormField
              label="Số giấy phép lái xe"
              error={errors.licenseNumber?.message}
              required
            >
              <Input
                {...register('licenseNumber')}
                type="text"
                placeholder="Nhập số GPLX"
                error={errors.licenseNumber}
              />
            </FormField>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              Đăng ký tài khoản tài xế
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
