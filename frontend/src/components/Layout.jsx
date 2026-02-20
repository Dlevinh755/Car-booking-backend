import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Layout = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navLinkClass = (path) => {
    const base = 'px-3 py-2 rounded-md text-sm font-medium transition-colors';
    return isActive(path)
      ? `${base} bg-primary-700 text-white`
      : `${base} text-white hover:bg-primary-700`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-primary-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span className="ml-2 text-white text-xl font-bold">Car Booking</span>
              </Link>
              
              {isAuthenticated && (
                <div className="ml-10 flex space-x-4">
                  <Link to="/dashboard" className={navLinkClass('/dashboard')}>
                    Dashboard
                  </Link>
                  <Link to="/booking/create" className={navLinkClass('/booking/create')}>
                    Tạo Booking
                  </Link>
                  <Link to="/driver" className={navLinkClass('/driver')}>
                    Driver Panel
                  </Link>
                </div>
              )}
            </div>

            <div className="flex items-center">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <div className="text-white text-sm">
                    <div className="font-medium">{user?.fullName}</div>
                    <div className="text-primary-200 text-xs">{user?.phone}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="px-4 py-2 bg-white text-primary-600 rounded-md text-sm font-medium hover:bg-primary-50 transition-colors"
                  >
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 bg-white text-primary-600 rounded-md text-sm font-medium hover:bg-primary-50 transition-colors"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-primary-700 text-white rounded-md text-sm font-medium hover:bg-primary-800 transition-colors"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-500 text-sm">
            © 2026 Car Booking System. Microservices MVP.
          </p>
        </div>
      </footer>
    </div>
  );
};
