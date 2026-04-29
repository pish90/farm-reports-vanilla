import { LogOut, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-end px-6 gap-4">
      <div className="flex items-center gap-2 text-sm text-gray-700">
        <User size={16} className="text-gray-400" />
        <span className="font-medium">{user?.name}</span>
        <span className="text-gray-400 text-xs bg-gray-100 px-2 py-0.5 rounded">{user?.role}</span>
      </div>
      <button
        onClick={logout}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
      >
        <LogOut size={16} />
        Logout
      </button>
    </header>
  );
}
