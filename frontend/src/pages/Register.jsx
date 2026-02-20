import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import { FormField, Input, Button } from '../components/FormField';

export const Register = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      fullName: '',
      phone: '',
      email: '',
      password: '',
      confirmPassword: ''
    }
  });

  const onSubmit = async (data) => {
    console.log('=== FORM SUBMIT ===');
    console.log('Form data:', data);
    console.log('Form data type:', typeof data);
    console.log('Form data keys:', Object.keys(data));
    console.log('Form data values:', Object.values(data));
    console.log('Form errors:', errors);
    
    // Check if data is actually populated
    if (!data || !data.fullName || !data.phone || !data.password) {
      console.error('❌ Form data is incomplete!', data);
      alert('Lỗi: Dữ liệu form không đầy đủ. Vui lòng thử lại.');
      return;
    }
    
    console.log('✅ Form data is valid, proceeding with registration...');
    
    setIsLoading(true);
    const result = await registerUser(data);
    setIsLoading(false);
    
    console.log('Register result:', result);

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
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng ký tài khoản Khách hàng
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500">
              Đăng nhập ngay
            </Link>
            {' | '}
            <Link to="/driver/register" className="font-medium text-primary-600 hover:text-primary-500">
              Đăng ký làm tài xế
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit, onError)}>
          <div className="rounded-md shadow-sm space-y-4">
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

          <div>
            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              Đăng ký
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
