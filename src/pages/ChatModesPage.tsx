import { useState, useEffect } from 'react';
import { MessageCircle, Maximize2, Code, ArrowLeft, Sparkles } from 'lucide-react';
import { ChatBubble } from '../components/ChatBubble';
import { WhatsAppChat } from '../components/WhatsAppChat';
import { EmbeddedChat } from '../components/EmbeddedChat';
import { Navbar } from '../components/Navbar';
import { supabase } from '../lib/supabase';

type ChatModesPageProps = {
  botId: string;
};

type DisplayMode = 'bubble' | 'whatsapp' | 'embed' | null;

const DEFAULT_COLOR = '#8eb4e3';

export function ChatModesPage({ botId }: ChatModesPageProps) {
  const [mode, setMode] = useState<DisplayMode>(null);
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLOR);

  useEffect(() => {
    supabase
      .from('bots')
      .select('primary_color')
      .eq('id', botId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.primary_color) setPrimaryColor(data.primary_color);
      });
  }, [botId]);

  function goBack() {
    window.history.pushState({}, '', '/client');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  if (mode === 'whatsapp') {
    return <WhatsAppChat botId={botId} botName="Chat Assistant" onBack={() => setMode(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 relative">
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-20 right-20 w-96 h-96 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <Navbar />

      {mode === 'bubble' && <ChatBubble botId={botId} primaryColor={primaryColor} />}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 relative z-10">
        <div className="mb-6 sm:mb-8">
          <button
            onClick={goBack}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-700 hover:text-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all border border-orange-200/50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm sm:text-base font-medium">Retour aux chatbots</span>
          </button>
        </div>

        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center justify-center mb-4 sm:mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full blur-xl opacity-50"></div>
              <div className="relative bg-gradient-to-br from-orange-500 to-amber-600 p-3 sm:p-4 rounded-2xl shadow-xl">
                <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.5} />
              </div>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent mb-3 sm:mb-4 px-4">
            Choisissez Votre Style d'Affichage
          </h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-700 font-medium px-4">
            Sélectionnez l'interface qui correspond le mieux à vos besoins
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <button
            onClick={() => setMode('bubble')}
            className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-orange-200/50 hover:border-orange-400 hover:-translate-y-1 active:translate-y-0 group text-left"
          >
            <div className="bg-gradient-to-br from-orange-100 to-amber-100 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto group-hover:from-orange-200 group-hover:to-amber-200 transition-all shadow-sm">
              <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" strokeWidth={2} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-2 sm:mb-3 group-hover:text-orange-700 transition-colors">Bulle de Chat</h2>
            <p className="text-sm sm:text-base text-slate-600 text-center leading-relaxed">
              Un bouton flottant discret qui s'ouvre en fenêtre de conversation
            </p>
          </button>

          <button
            onClick={() => setMode('whatsapp')}
            className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-orange-200/50 hover:border-green-400 hover:-translate-y-1 active:translate-y-0 group text-left"
          >
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto group-hover:from-green-200 group-hover:to-emerald-200 transition-all shadow-sm">
              <Maximize2 className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" strokeWidth={2} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-2 sm:mb-3 group-hover:text-green-700 transition-colors">Plein Écran</h2>
            <p className="text-sm sm:text-base text-slate-600 text-center leading-relaxed">
              Interface immersive style WhatsApp pour des conversations approfondies
            </p>
          </button>

          <button
            onClick={() => setMode('embed')}
            className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-2xl transition-all cursor-pointer border-2 border-orange-200/50 hover:border-blue-400 hover:-translate-y-1 active:translate-y-0 group text-left sm:col-span-2 lg:col-span-1"
          >
            <div className="bg-gradient-to-br from-blue-100 to-cyan-100 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mb-4 sm:mb-6 mx-auto group-hover:from-blue-200 group-hover:to-cyan-200 transition-all shadow-sm">
              <Code className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" strokeWidth={2} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 text-center mb-2 sm:mb-3 group-hover:text-blue-700 transition-colors">Intégré</h2>
            <p className="text-sm sm:text-base text-slate-600 text-center leading-relaxed">
              Widget élégant qui s'intègre parfaitement dans votre contenu
            </p>
          </button>
        </div>

        {mode === 'embed' && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <button
                onClick={() => setMode(null)}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/80 backdrop-blur-sm hover:bg-white text-slate-700 hover:text-orange-600 rounded-xl shadow-sm hover:shadow-md transition-all border border-orange-200/50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm sm:text-base font-medium">Retour à la sélection</span>
              </button>
            </div>

            <div className="bg-white/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-2xl border border-orange-200/50">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-3 sm:mb-4 text-center">
                  Assistant Intelligent
                </h2>
                <p className="text-base sm:text-lg text-slate-700 mb-6 sm:mb-8 text-center font-medium">
                  Posez vos questions et obtenez des réponses instantanées
                </p>
                <EmbeddedChat
                  botId={botId}
                  title="Discutez avec l'assistant"
                  description="Obtenez des réponses instantanées à vos questions"
                  primaryColor={primaryColor}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
