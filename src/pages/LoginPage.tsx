import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Bot, Sparkles, MessageCircle } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-20 left-20 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="w-full max-w-6xl flex items-center justify-center gap-12 relative z-10">
        <div className="hidden lg:flex flex-col items-center justify-center flex-1 text-center space-y-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-500 rounded-full blur-2xl opacity-50 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-orange-500 to-amber-600 p-8 rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <Bot className="w-24 h-24 text-white" strokeWidth={1.5} />
            </div>
          </div>

          <div className="space-y-4 max-w-lg">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent leading-tight">
              Un assistant IA personnalisé
            </h1>
            <p className="text-xl text-slate-700 leading-relaxed font-medium">
              Testez votre chatbot créé sur mesure
            </p>
            <div className="flex items-center justify-center gap-8 pt-4">
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-3 rounded-2xl shadow-lg">
                  <MessageCircle className="w-8 h-8 text-orange-500" />
                </div>
                <span className="text-sm text-slate-600 font-medium">Conversations naturelles</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-3 rounded-2xl shadow-lg">
                  <Sparkles className="w-8 h-8 text-amber-500" />
                </div>
                <span className="text-sm text-slate-600 font-medium">Intelligence avancée</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-3 rounded-2xl shadow-lg">
                  <Bot className="w-8 h-8 text-yellow-600" />
                </div>
                <span className="text-sm text-slate-600 font-medium">100% personnalisable</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/50">
            <div className="flex items-center justify-center mb-6 lg:hidden">
              <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-4 rounded-2xl shadow-lg">
                <Bot className="w-10 h-10 text-white" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-2">
              Bienvenue
            </h2>
            <p className="text-center text-slate-600 mb-8 font-medium">
              Connectez-vous pour accéder à votre espace
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all shadow-sm hover:border-orange-300"
                  placeholder="vous@exemple.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                  Mot de passe
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white border-2 border-orange-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-orange-400 outline-none transition-all shadow-sm hover:border-orange-300"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold py-3 px-6 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-500">
                Plateforme de gestion de chatbots intelligents
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
