import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Code2, LogOut, User, BarChart3, Zap } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <Code2 className="w-8 h-8 text-sky-400" />
            <span className="text-xl font-bold text-white">Codebot</span>
          </Link>
          <div className="flex items-center gap-6">
            <Link to="/pricing" className="text-gray-400 hover:text-white transition-colors text-sm">Pricing</Link>
            {user ? (
              <>
                <Link to="/dashboard" className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm">
                  <BarChart3 className="w-4 h-4" />Dashboard
                </Link>
                <Link to="/circuit-builder" className="flex items-center gap-1 text-gray-400 hover:text-yellow-400 transition-colors text-sm">
                  <Zap className="w-4 h-4" />Circuit Builder
                </Link>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 flex items-center gap-1">
                    <User className="w-4 h-4" />{user.name}
                    <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-sky-500/20 text-sky-400 capitalize">{user.tier}</span>
                  </span>
                  <button onClick={handleLogout} className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors text-sm">
                    <LogOut className="w-4 h-4" />Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm">Login</Link>
                <Link to="/register" className="bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
