import { Outlet, Link, useNavigate } from 'react-router-dom';
import { authApi } from '../lib/api';

interface LayoutProps {
  user: any;
  setUser: (user: any) => void;
}

function Layout({ user, setUser }: LayoutProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      navigate('/');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Navigation */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="px-6">
          <div className="flex justify-between items-center h-14">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-red-600 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-lg font-semibold text-gray-900">Course Platform</span>
            </Link>
            
            {user && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <img 
                    src={user.avatarUrl} 
                    alt={user.username}
                    className="w-7 h-7 rounded-full"
                  />
                  <span className="text-sm text-gray-700">{user.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      {/* Main Content */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;