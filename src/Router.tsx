import { useState, useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { BotManagePage } from './pages/BotManagePage';
import { DemoPage } from './pages/DemoPage';
import { ClientPage } from './pages/ClientPage';
import { ClientDashboard } from './pages/ClientDashboard';
import { ChatModesPage } from './pages/ChatModesPage';
import { ProtectedRoute } from './components/ProtectedRoute';

export function Router() {
  const { client, loading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');

      if (anchor && anchor.href && anchor.origin === window.location.origin) {
        const url = new URL(anchor.href);
        if (!anchor.hasAttribute('target')) {
          e.preventDefault();
          window.history.pushState({}, '', url.pathname);
          setCurrentPath(url.pathname);
        }
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-600">Chargement...</div>
      </div>
    );
  }

  const demoMatch = currentPath.match(/^\/demo\/([a-f0-9-]+)$/);
  if (demoMatch) {
    return <DemoPage botId={demoMatch[1]} />;
  }

  const modesMatch = currentPath.match(/^\/chat-modes\/([a-f0-9-]+)$/);
  if (modesMatch) {
    return <ChatModesPage botId={modesMatch[1]} />;
  }

  const clientMatch = currentPath.match(/^\/client\/([a-f0-9-]+)$/);
  if (clientMatch) {
    return (
      <ProtectedRoute>
        <ClientPage botId={clientMatch[1]} />
      </ProtectedRoute>
    );
  }

  const botManageMatch = currentPath.match(/^\/admin\/bots\/([a-f0-9-]+)$/);
  if (botManageMatch) {
    return (
      <ProtectedRoute requireAdmin>
        <BotManagePage botId={botManageMatch[1]} />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/client') {
    return (
      <ProtectedRoute>
        <ClientDashboard />
      </ProtectedRoute>
    );
  }

  if (currentPath === '/admin' || currentPath === '/' || currentPath === '/login') {
    if (!client) {
      return <LoginPage />;
    }

    if (client.role === 'admin') {
      if (currentPath !== '/admin') {
        window.history.pushState({}, '', '/admin');
        setCurrentPath('/admin');
      }
      return (
        <ProtectedRoute requireAdmin>
          <AdminDashboard />
        </ProtectedRoute>
      );
    }

    if (client.role === 'client') {
      if (currentPath !== '/client') {
        window.history.pushState({}, '', '/client');
        setCurrentPath('/client');
      }
      return (
        <ProtectedRoute>
          <ClientDashboard />
        </ProtectedRoute>
      );
    }
  }

  if (currentPath === '/client' && client?.role === 'admin') {
    window.history.pushState({}, '', '/admin');
    setCurrentPath('/admin');
    return (
      <ProtectedRoute requireAdmin>
        <AdminDashboard />
      </ProtectedRoute>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-slate-600">Page introuvable</div>
    </div>
  );
}
