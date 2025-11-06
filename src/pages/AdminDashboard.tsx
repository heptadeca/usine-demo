import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import { Plus, Loader2, ExternalLink, Trash2, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Bot, Client } from '../lib/supabase';

export function AdminDashboard() {
  const { client } = useAuth();
  const [bots, setBots] = useState<Bot[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBotName, setNewBotName] = useState('');
  const [creating, setCreating] = useState(false);

  const [showCreateClientModal, setShowCreateClientModal] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPassword, setNewClientPassword] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);

  useEffect(() => {
    loadBots();
    loadClients();
  }, []);

  async function loadBots() {
    try {
      const { data, error } = await supabase
        .from('bots')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setBots(data);
      }
    } catch (error) {
      console.error('Failed to load bots:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('role', 'client')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setClients(data);
      }
    } catch (error) {
      console.error('Failed to load clients:', error);
    }
  }

  async function createBot() {
    if (!newBotName.trim() || !client) return;

    setCreating(true);
    try {
      const apiKey = `bot_${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;

      const { error } = await supabase
        .from('bots')
        .insert({
          name: newBotName,
          owner_client_id: client.id,
          status: 'ready',
          api_key: apiKey,
          n8n_ingest_url: 'https://n8n.prcz.fr/webhook/lacroix-ingestdata',
          n8n_chat_url: 'https://n8n.prcz.fr/webhook/lacroix-chat',
        });

      if (!error) {
        setNewBotName('');
        setShowCreateModal(false);
        await loadBots();
      } else {
        console.error('Failed to create bot:', error);
      }
    } catch (error) {
      console.error('Failed to create bot:', error);
    } finally {
      setCreating(false);
    }
  }

  async function deleteBot(botId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce bot ? Cette action est irréversible.')) return;

    try {
      const { error } = await supabase
        .from('bots')
        .delete()
        .eq('id', botId);

      if (!error) {
        await loadBots();
      }
    } catch (error) {
      console.error('Failed to delete bot:', error);
    }
  }

  async function createClient() {
    if (!newClientEmail.trim() || !newClientPassword.trim()) return;

    setCreatingClient(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Session expired. Please login again.');
        return;
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-client`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newClientEmail,
          password: newClientPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Failed to create client:', result.error);
        alert('Failed to create client: ' + result.error);
        return;
      }

      setNewClientEmail('');
      setNewClientPassword('');
      setShowCreateClientModal(false);
      await loadClients();
      alert(`Client created successfully!`);
    } catch (error) {
      console.error('Failed to create client:', error);
      alert('Failed to create client');
    } finally {
      setCreatingClient(false);
    }
  }

  async function deleteClient(clientId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ? Cette action supprimera aussi tous ses bots, sessions et accès. Cette action est irréversible.')) return;

    try {
      const { error: sessionsError } = await supabase
        .from('sessions')
        .delete()
        .eq('client_id', clientId);

      if (sessionsError) {
        console.error('Failed to delete sessions:', sessionsError);
      }

      const { error: botsError } = await supabase
        .from('bots')
        .delete()
        .eq('owner_client_id', clientId);

      if (botsError) {
        console.error('Failed to delete bots:', botsError);
      }

      const { error: clientError } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (clientError) {
        console.error('Failed to delete client:', clientError);
        alert('Erreur lors de la suppression du client: ' + clientError.message);
        return;
      }

      const { error: authError } = await supabase.auth.admin.deleteUser(clientId);

      if (authError) {
        console.error('Failed to delete auth user:', authError);
      }

      await loadClients();
      await loadBots();
      alert('Client supprimé avec succès');
    } catch (error) {
      console.error('Failed to delete client:', error);
      alert('Erreur lors de la suppression du client');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-12">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Chatbots</h1>
              <p className="text-slate-600 mt-1">Gérez vos instances de chatbot RAG</p>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Créer un Bot
            </button>
          </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        ) : bots.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <p className="text-slate-600">Aucun chatbot pour le moment. Créez-en un !</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Nom
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Créé le
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {bots.map((bot) => (
                  <tr key={bot.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{bot.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          bot.status === 'ready'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {bot.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(bot.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-3">
                        <a
                          href={`/admin/bots/${bot.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          Gérer
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => deleteBot(bot.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                          title="Supprimer le bot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>

        <div>
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-7 h-7" />
                Clients
              </h2>
              <p className="text-slate-600 mt-1">Gérer les comptes clients</p>
            </div>

            <button
              onClick={() => setShowCreateClientModal(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition font-medium"
            >
              <Plus className="w-4 h-4" />
              Créer un Client
            </button>
          </div>

          {clients.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <p className="text-slate-600">Aucun client pour le moment. Créez-en un !</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Créé le
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {clients.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-900">{c.email}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => deleteClient(c.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition"
                          title="Supprimer le client"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreateClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Créer un Nouveau Client</h2>

            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="client@exemple.com"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={newClientPassword}
                  onChange={(e) => setNewClientPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateClientModal(false);
                  setNewClientEmail('');
                  setNewClientPassword('');
                }}
                disabled={creatingClient}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={createClient}
                disabled={creatingClient || !newClientEmail.trim() || !newClientPassword.trim()}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingClient ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Créer un Nouveau Bot</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Nom du Bot
              </label>
              <input
                type="text"
                value={newBotName}
                onChange={(e) => setNewBotName(e.target.value)}
                placeholder="Mon Chatbot"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={createBot}
                disabled={creating || !newBotName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Création...' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
