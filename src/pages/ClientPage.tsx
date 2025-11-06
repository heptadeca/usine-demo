import { useState, useEffect } from 'react';
import { ChatWidget } from '../components/ChatWidget';
import { Loader2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Bot } from '../lib/supabase';

type ClientPageProps = {
  botId: string;
};

export function ClientPage({ botId }: ClientPageProps) {
  const { client, logout } = useAuth();
  const [bot, setBot] = useState<Bot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBotData();
  }, [botId]);

  async function loadBotData() {
    try {
      const { data: botData } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .maybeSingle();

      if (botData) {
        setBot(botData);
      }
    } catch (error) {
      console.error('Failed to load bot data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-red-600 text-lg font-medium">Bot not found or access denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
      <nav className="bg-white/80 backdrop-blur-sm border-b border-indigo-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">{bot.name.charAt(0).toUpperCase()}</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {bot.name}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-slate-600 font-medium">{client?.email}</span>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        <div className="w-full max-w-5xl h-full flex flex-col">
          <div className="flex-1 bg-white rounded-3xl shadow-2xl overflow-hidden border border-indigo-100">
            <ChatWidget botId={botId} />
          </div>
        </div>
      </div>
    </div>
  );
}
