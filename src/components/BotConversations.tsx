import { useEffect, useState } from 'react';
import { getBotConversations, getConversationMessages, deleteConversation, Conversation, Message } from '../api/analytics';
import { MessageSquare, X, Loader2, Trash2, Monitor } from 'lucide-react';

interface BotConversationsProps {
  botId: string;
}

interface MessagePair {
  date: string;
  userMessage: string;
  botResponse: string;
}

function pairMessages(messages: Message[]): MessagePair[] {
  const pairs: MessagePair[] = [];
  let i = 0;
  while (i < messages.length) {
    const msg = messages[i];
    if (msg.role === 'user') {
      const next = messages[i + 1];
      pairs.push({
        date: msg.created_at,
        userMessage: msg.content,
        botResponse: next && next.role === 'assistant' ? next.content : '',
      });
      i += next && next.role === 'assistant' ? 2 : 1;
    } else {
      i++;
    }
  }
  return pairs;
}

export default function BotConversations({ botId }: BotConversationsProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    loadConversations();
  }, [botId]);

  async function loadConversations() {
    try {
      setLoading(true);
      const data = await getBotConversations(botId);
      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(conversation: Conversation) {
    try {
      setLoadingMessages(true);
      setSelectedConversation(conversation);
      const data = await getConversationMessages(conversation.session_id);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleDeleteConversation(sessionId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette conversation ? Cette action est irréversible.')) return;
    try {
      const success = await deleteConversation(sessionId);
      if (success) {
        setConversations(conversations.filter(c => c.session_id !== sessionId));
        if (selectedConversation?.session_id === sessionId) {
          setSelectedConversation(null);
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Erreur lors de la suppression de la conversation');
    }
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatShortDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'A l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-600">Aucune conversation pour ce bot.</p>
        <p className="text-sm text-slate-500 mt-2">
          Les conversations apparaîtront ici dès que des utilisateurs interagiront avec le bot.
        </p>
      </div>
    );
  }

  const pairs = pairMessages(messages);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <h3 className="font-semibold text-slate-900">
              Conversations ({conversations.length})
            </h3>
          </div>
          <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
            {conversations.map((conv) => (
              <div
                key={conv.session_id}
                className={`group relative ${
                  selectedConversation?.session_id === conv.session_id
                    ? 'bg-blue-50 border-l-4 border-blue-600'
                    : ''
                }`}
              >
                <button
                  onClick={() => loadMessages(conv)}
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 transition"
                >
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0 pr-8">
                      <p className="text-sm text-slate-900 truncate font-medium">
                        {conv.first_message_preview || 'Nouvelle conversation'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500">
                        <span>{conv.message_count} msg</span>
                        <span>•</span>
                        <span>{formatShortDate(conv.created_at)}</span>
                      </div>
                      {conv.ip_address && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400">
                          <Monitor className="w-3 h-3" />
                          <span className="font-mono">{conv.ip_address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
                <button
                  onClick={(e) => handleDeleteConversation(conv.session_id, e)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition opacity-0 group-hover:opacity-100"
                  title="Supprimer la conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedConversation ? (
          <div className="bg-white rounded-lg border border-slate-200">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Historique de conversation</h3>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                  <span>{formatDate(selectedConversation.created_at)}</span>
                  <span>•</span>
                  <span>{selectedConversation.message_count} messages</span>
                  {selectedConversation.ip_address && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        <span className="font-mono">{selectedConversation.ip_address}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedConversation(null)}
                className="p-1 hover:bg-slate-200 rounded transition"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {loadingMessages ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[560px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">
                        Date et heure
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide w-1/2">
                        Message utilisateur
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Reponse chatbot
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pairs.map((pair, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 align-top">
                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap font-mono">
                          {formatDate(pair.date)}
                        </td>
                        <td className="px-4 py-3 text-slate-800 whitespace-pre-wrap break-words">
                          {pair.userMessage}
                        </td>
                        <td className="px-4 py-3 text-slate-700 whitespace-pre-wrap break-words">
                          {pair.botResponse || <span className="text-slate-400 italic text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600">
              Selectionnez une conversation pour voir les messages
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
