import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import { FormField, Input, Button } from '../components/FormField';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      identifier: '',
      password: ''
    }
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    const result = await login(data.identifier, data.password);
    setIsLoading(false);

    if (result.success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Đăng nhập
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Hoặc{' '}
            <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500">
              đăng ký làm khách hàng
            </Link>
            {' | '}
            <Link to="/driver/register" className="font-medium text-primary-600 hover:text-primary-500">
              đăng ký làm tài xế
            </Link>
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="rounded-md shadow-sm space-y-4">
            <FormField
              label="Số điện thoại hoặc Email"
              error={errors.identifier?.message}
              required
            >
              <Input
                {...register('identifier')}
                type="text"
                placeholder="0912345678 hoặc email@example.com"
                error={errors.identifier}
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
                placeholder="Nhập mật khẩu"
                error={errors.password}
              />
            </FormField>
          </div>

          <div>
            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              Đăng nhập
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
