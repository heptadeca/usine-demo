import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navbar } from '../components/Navbar';
import BotConversations from '../components/BotConversations';
import { Upload, FileText, Loader2, Trash2, Code, Users, Plus, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { deleteDatasource } from '../api/datasources';
import type { Bot, Datasource, Event, Client, BotClientAccess } from '../lib/supabase';

type TabType = 'data' | 'integration' | 'clients' | 'events' | 'prompt' | 'conversations';

type BotManagePageProps = {
  botId: string;
};

export function BotManagePage({ botId }: BotManagePageProps) {
  const { token } = useAuth();
  const [bot, setBot] = useState<Bot | null>(null);
  const [datasources, setDatasources] = useState<Datasource[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('data');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);


  const [allClients, setAllClients] = useState<Client[]>([]);
  const [authorizedClients, setAuthorizedClients] = useState<BotClientAccess[]>([]);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState('');

  const [promptText, setPromptText] = useState('');
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('#8eb4e3');
  const [savingColor, setSavingColor] = useState(false);

  useEffect(() => {
    loadBotData();
  }, [botId]);

  async function loadBotData() {
    try {
      const { data: botData, error: botError } = await supabase
        .from('bots')
        .select('*')
        .eq('id', botId)
        .maybeSingle();

      if (!botError && botData) {
        setBot(botData);
        setPromptText(botData.prompt || '');
        setPrimaryColor((botData as any).primary_color || '#8eb4e3');
      }

      const { data: dsData, error: dsError } = await supabase
        .from('datasources')
        .select('*')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false });

      if (!dsError && dsData) {
        setDatasources(dsData);
      }

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!eventsError && eventsData) {
        setEvents(eventsData);
      }

      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .eq('role', 'client')
        .order('email');

      if (!clientsError && clientsData) {
        setAllClients(clientsData);
      }

      const { data: accessData, error: accessError } = await supabase
        .from('bot_client_access')
        .select('*, clients(email)')
        .eq('bot_id', botId);

      if (!accessError && accessData) {
        setAuthorizedClients(accessData);
      }
    } catch (error) {
      console.error('Failed to load bot data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.name.endsWith('.pdf')
      ? 'pdf'
      : file.name.endsWith('.csv')
      ? 'csv'
      : 'text';

    setUploading(true);
    try {
      const sanitizedFileName = file.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${botId}/${Date.now()}-${sanitizedFileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('datasource-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('File upload failed:', uploadError);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('datasource-files')
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('datasources')
        .insert({
          bot_id: botId,
          type: fileType,
          source_filename: file.name,
          url_or_path: publicUrlData.publicUrl,
          content_hash: `hash-${Date.now()}`,
          status: 'new',
        })
        .select()
        .single();

      if (!error && data) {
        const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ingest-datasource`;

        console.log('Appel de la fonction d\'ingestion pour:', data.id);

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ datasourceId: data.id }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error('Erreur de la fonction d\'ingestion:', errorData);
            alert(`Erreur lors de l'ingestion: ${errorData.error || 'Erreur inconnue'}`);

            await supabase
              .from('datasources')
              .update({ status: 'error' })
              .eq('id', data.id);
          } else {
            console.log('Ingestion réussie');
          }
        } catch (fetchError) {
          console.error('Erreur lors de l\'appel à la fonction:', fetchError);
          alert('Erreur lors de l\'appel à la fonction d\'ingestion');

          await supabase
            .from('datasources')
            .update({ status: 'error' })
            .eq('id', data.id);
        }

        await loadBotData();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  }


  async function handleDelete(dsId: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette source de données ?')) return;

    try {
      await deleteDatasource(botId, dsId);
      await loadBotData();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }


  async function handleAddClient() {
    if (!selectedClientId) return;

    try {
      const { error } = await supabase
        .from('bot_client_access')
        .insert({
          bot_id: botId,
          client_id: selectedClientId,
        });

      if (!error) {
        setShowAddClientModal(false);
        setSelectedClientId('');
        await loadBotData();
      }
    } catch (error) {
      console.error('Failed to add client:', error);
    }
  }

  async function handleRemoveClient(accessId: string) {
    if (!confirm('Retirer ce client de la démo ?')) return;

    try {
      const { error } = await supabase
        .from('bot_client_access')
        .delete()
        .eq('id', accessId);

      if (!error) {
        await loadBotData();
      }
    } catch (error) {
      console.error('Failed to remove client:', error);
    }
  }

  async function saveColor() {
    if (!bot) return;
    setSavingColor(true);
    try {
      await supabase
        .from('bots')
        .update({ primary_color: primaryColor } as any)
        .eq('id', bot.id);
    } catch (error) {
      console.error('Failed to save color:', error);
    } finally {
      setSavingColor(false);
    }
  }

  async function savePrompt() {
    if (!bot) return;

    setSavingPrompt(true);
    try {
      const { error } = await supabase
        .from('bots')
        .update({ prompt: promptText })
        .eq('id', bot.id);

      if (!error) {
        await loadBotData();
      }
    } catch (error) {
      console.error('Failed to save prompt:', error);
    } finally {
      setSavingPrompt(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-red-600">Bot not found</div>
        </div>
      </div>
    );
  }

  const embedCode = `<iframe src="${window.location.origin}/demo/${botId}" width="100%" height="640" frameborder="0"></iframe>`;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <a
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              window.history.pushState({}, '', '/admin');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="text-blue-600 hover:text-blue-700 text-sm mb-2 inline-block"
          >
            ← Retour au Tableau de bord
          </a>
          <h1 className="text-3xl font-bold text-slate-900">{bot.name}</h1>
          <p className="text-slate-600 mt-1">Gérer les sources de données et l'intégration</p>
        </div>

        <div className="border-b border-slate-200 mb-6">
          <div className="flex gap-6">
            {(['data', 'integration', 'clients', 'conversations', 'events', 'prompt'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`pb-3 px-1 border-b-2 transition font-medium capitalize ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'data' ? 'Données' : tab === 'integration' ? 'Intégration' : tab === 'clients' ? 'Clients' : tab === 'conversations' ? 'Conversations' : tab === 'events' ? 'Événements' : 'Prompt'}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'data' && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg cursor-pointer transition shadow-sm">
                <Upload className="w-5 h-5" />
                Télécharger PDF
                <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" disabled={uploading} />
              </label>
            </div>

            {uploading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                  <span className="text-sm text-blue-700">Traitement...</span>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {datasources.length === 0 ? (
                <div className="p-12 text-center text-slate-600">
                  Aucune source de données pour le moment. Ajoutez-en une !
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Créé le</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {datasources.map((ds) => (
                      <tr key={ds.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium uppercase">
                            {ds.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">{ds.source_filename}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              ds.status === 'indexed'
                                ? 'bg-green-100 text-green-700'
                                : ds.status === 'error'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {ds.status === 'indexed' ? 'Indexé' : ds.status === 'error' ? 'Erreur' : ds.status === 'new' ? 'Nouveau' : ds.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(ds.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleDelete(ds.id)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'integration' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Couleur principale du chatbot</h3>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-12 h-12 rounded-lg cursor-pointer border border-slate-200 p-1"
                    title="Choisir une couleur"
                  />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(val)) setPrimaryColor(val);
                    }}
                    className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono w-32"
                    placeholder="#8eb4e3"
                  />
                  <div
                    className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm flex-shrink-0"
                    style={{ background: primaryColor }}
                  />
                  <button
                    onClick={saveColor}
                    disabled={savingColor}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {savingColor ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button
                    onClick={() => setPrimaryColor('#8eb4e3')}
                    className="px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition"
                  >
                    Réinitialiser
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                Cette couleur s'applique au bouton d'appel, à l'avatar et aux éléments colorés du chatbot. Valeur par défaut : #8eb4e3
              </p>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Code className="w-5 h-5" />
                Code d'Intégration
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Widget Bubble (Recommandé)
                  </label>
                  <p className="text-xs text-slate-500 mb-3">
                    Ajoutez ce code avant la balise <code className="bg-slate-100 px-1 py-0.5 rounded text-xs">&lt;/body&gt;</code> de votre page HTML pour afficher un chatbot en mode bubble flottant
                  </p>
                  <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm overflow-x-auto">
                    <code>{`<script src="${window.location.origin}/chatbot-widget.js"></script>
<script>
  ChatbotWidget.init({
    botId: '${botId}',
    origin: '${window.location.origin}'
  });
</script>`}</code>
                  </pre>
                  <div className="mt-2 flex items-center gap-2">
                    <a
                      href={`/chat-bubble.html?botId=${botId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                    >
                      Prévisualiser
                    </a>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Intégration iframe (Simple)
                  </label>
                  <pre className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm overflow-x-auto">
                    <code>{embedCode}</code>
                  </pre>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    URL de Démo (Basique)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/demo/${botId}`}
                      readOnly
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                    <a
                      href={`/demo/${botId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                    >
                      Ouvrir
                    </a>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    URL Modes de Chat (Bulle, WhatsApp, Intégré)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={`${window.location.origin}/chat-modes/${botId}`}
                      readOnly
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                    <a
                      href={`/chat-modes/${botId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium"
                    >
                      Ouvrir
                    </a>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Cette page permet aux utilisateurs de choisir parmi 3 modes d'affichage : Chat bulle, Style WhatsApp, ou Widget intégré
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'clients' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Clients de Démo
              </h3>
              <button
                onClick={() => setShowAddClientModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                <Plus className="w-4 h-4" />
                Ajouter un Client
              </button>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {authorizedClients.length === 0 ? (
                <div className="p-12 text-center text-slate-600">
                  Aucun client autorisé pour le moment. Ajoutez des clients pour leur donner accès à la démo.
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Ajouté le</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {authorizedClients.map((access: any) => (
                      <tr key={access.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-900">{access.clients?.email}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(access.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRemoveClient(access.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            {events.length === 0 ? (
              <div className="p-12 text-center text-slate-600">Aucun événement pour le moment</div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Horodatage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{event.type}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'conversations' && (
          <BotConversations botId={botId} />
        )}

        {activeTab === 'prompt' && (
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-purple-100 p-2 rounded-lg">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Prompt Système</h3>
                <p className="text-sm text-slate-600">
                  Configurez le comportement et la personnalité de votre chatbot. Ce prompt sera envoyé au webhook de chat avec chaque message.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Texte du Prompt
                </label>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Vous êtes un assistant utile qui fournit des réponses précises et concises basées sur la documentation fournie..."
                  rows={16}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none font-mono text-sm"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Conseil : Soyez précis sur le rôle du bot, son ton, et comment il doit gérer différents types de questions.
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setPromptText(bot?.prompt || '')}
                  disabled={savingPrompt}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
                >
                  Réinitialiser
                </button>
                <button
                  onClick={savePrompt}
                  disabled={savingPrompt}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {savingPrompt ? 'Enregistrement...' : 'Enregistrer le Prompt'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>


      {showAddClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Ajouter un Client de Démo</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sélectionner un Client
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Choisir un client...</option>
                  {allClients
                    .filter(c => !authorizedClients.some(ac => ac.client_id === c.id))
                    .map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.email}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddClientModal(false);
                  setSelectedClientId('');
                }}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                onClick={handleAddClient}
                disabled={!selectedClientId}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
