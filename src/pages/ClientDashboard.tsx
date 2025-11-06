import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { MessageSquare, Loader2, ArrowRight, Sparkles, Bot } from 'lucide-react';
import { supabase } from '../lib/supabase';

type BotType = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

export function ClientDashboard() {
  const { client } = useAuth();
  const [bots, setBots] = useState<BotType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBots();
  }, []);

  async function loadBots() {
    try {
      const { data: accessRecords } = await supabase
        .from('bot_client_access')
        .select('bot_id, bots(id, name, status, created_at)')
        .eq('client_id', client?.id);

      if (accessRecords) {
        const botsData = accessRecords
          .map((record: any) => record.bots)
          .filter(Boolean);
        setBots(botsData);
      }
    } catch (error) {
      console.error('Failed to load bots:', error);
    } finally {
      setLoading(false);
    }
  }

  function navigateToBot(botId: string) {
    window.history.pushState({}, '', `/chat-modes/${botId}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 relative z-10">
        <div className="mb-8 sm:mb-12 text-center">
          <div className="inline-flex items-center justify-center mb-4 sm:mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full blur-xl opacity-50"></div>
              <div className="relative bg-gradient-to-br from-orange-500 to-amber-600 p-3 sm:p-4 rounded-2xl shadow-xl">
                <Bot className="w-8 h-8 sm:w-12 sm:h-12 text-white" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent mb-3 sm:mb-4 px-4">
            Vos Assistants IA
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-700 font-medium px-4">
            Sélectionnez un chatbot pour commencer une conversation intelligente
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="relative">
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
              <div className="absolute inset-0 bg-orange-400 rounded-full blur-xl opacity-50"></div>
            </div>
          </div>
        ) : bots.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white/50 p-6 sm:p-8 lg:p-12 text-center">
              <div className="inline-flex items-center justify-center mb-4 sm:mb-6">
                <div className="bg-gradient-to-br from-orange-100 to-amber-100 p-4 sm:p-6 rounded-2xl">
                  <MessageSquare className="w-12 h-12 sm:w-16 sm:h-16 text-orange-500" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2 sm:mb-3">
                Aucun chatbot disponible
              </h3>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                Vous n'avez pas encore accès à des chatbots. Contactez votre administrateur pour commencer.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bots.map((bot) => (
              <button
                key={bot.id}
                onClick={() => navigateToBot(bot.id)}
                className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border-2 border-orange-200/50 p-6 text-left hover:shadow-2xl hover:border-orange-400 transition-all group hover:-translate-y-1 active:translate-y-0"
              >
                <div className="flex flex-col h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 rounded-xl group-hover:from-orange-200 group-hover:to-amber-200 transition-all shadow-sm">
                      <MessageSquare className="w-8 h-8 text-orange-600" strokeWidth={2} />
                    </div>
                    <ArrowRight className="w-6 h-6 text-orange-400 group-hover:text-orange-600 group-hover:translate-x-2 transition-all" strokeWidth={2} />
                  </div>

                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-orange-700 transition-colors">
                      {bot.name}
                    </h3>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm ${
                          bot.status === 'ready'
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200'
                            : 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-700 border border-slate-200'
                        }`}
                      >
                        <Sparkles className="w-4 h-4" />
                        {bot.status === 'ready' ? 'Actif' : 'Brouillon'}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-orange-100">
                    <p className="text-sm text-slate-600 font-medium">
                      Cliquez pour discuter
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {bots.length > 0 && (
          <div className="mt-8 sm:mt-12 text-center">
            <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm px-4 sm:px-6 py-2 sm:py-3 rounded-full border border-orange-200/50 shadow-sm">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
              <p className="text-xs sm:text-sm text-slate-700 font-medium">
                {bots.length} chatbot{bots.length > 1 ? 's' : ''} disponible{bots.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
