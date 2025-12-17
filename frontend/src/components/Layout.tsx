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
    <div className="min-h-screen w-full bg-white font-sans text-gray-900">
      {/* Top Navigation */}
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="px-4">
          <div className="flex justify-between items-center h-14">
            <Link to="/" className="text-base font-semibold text-gray-900 no-underline">
              Course Platform
            </Link>
            {user && (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-700">{user.username}</span>
                <button
                  onClick={handleLogout}
                  className="text-gray-500 text-sm border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 transition-none"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;