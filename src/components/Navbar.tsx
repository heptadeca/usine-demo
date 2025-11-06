import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

export function Navbar() {
  const { client, logout } = useAuth();

  return (
    <nav className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {client && (
            <>
              <span className="text-xs sm:text-sm text-slate-700 font-medium truncate max-w-[150px] sm:max-w-none">{client.email}</span>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="text-xs sm:text-sm font-medium">Déconnexion</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
