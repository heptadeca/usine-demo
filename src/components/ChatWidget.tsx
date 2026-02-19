import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { hexToRgbString, getIconFilter } from '../lib/colorUtils';
import type { Message } from '../lib/supabase';

type ChatWidgetProps = {
  botId: string;
  token?: string;
  primaryColor?: string;
};

const DEFAULT_COLOR = '#8eb4e3';

export function ChatWidget({ botId, primaryColor = DEFAULT_COLOR }: ChatWidgetProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createSession();
  }, [botId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }

  async function getIpAddress(): Promise<string | null> {
    try {
      const res = await fetch('https://api.ipify.org?format=json');
      const data = await res.json();
      return data.ip || null;
    } catch {
      return null;
    }
  }

  async function createSession() {
    try {
      const ip = await getIpAddress();
      const { data: session, error } = await supabase
        .from('sessions')
        .insert({ bot_id: botId, ip_address: ip })
        .select()
        .single();

      if (error) {
        console.error('Failed to create session:', error);
        return;
      }

      setSessionId(session.id);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }

  async function sendMessageToBot(userMessage: string, currentSessionId: string) {
    setLoading(true);

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      session_id: currentSessionId,
      role: 'user',
      content: userMessage,
      latency_ms: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      await supabase.from('messages').insert({
        session_id: currentSessionId,
        role: 'user',
        content: userMessage,
      });

      const { data: bot } = await supabase
        .from('bots')
        .select('n8n_chat_url, prompt')
        .eq('id', botId)
        .maybeSingle();

      if (!bot) throw new Error('Bot introuvable');

      const startTime = Date.now();
      const chatUrl = bot.n8n_chat_url || 'https://n8n.prcz.fr/webhook/lacroix-chat';

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: botId,
          session_id: currentSessionId,
          message: userMessage,
          prompt: bot.prompt || '',
          k: 8,
          temperature: 0.2,
          max_tokens: 350,
        }),
      });

      if (!response.ok) throw new Error('Échec de la récupération de la réponse du service de chat');

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      let responseContent = data.output || data.answer || data.response || 'Aucune réponse';
      if (typeof responseContent === 'object') {
        responseContent = responseContent.output || JSON.stringify(responseContent);
      }
      responseContent = String(responseContent);

      await supabase.from('messages').insert({
        session_id: currentSessionId,
        role: 'assistant',
        content: responseContent,
        latency_ms: latencyMs,
      });

      const assistantMessage: Message = {
        id: `temp-${Date.now()}-assistant`,
        session_id: currentSessionId,
        role: 'assistant',
        content: responseContent,
        latency_ms: latencyMs,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `temp-${Date.now()}-error`,
        session_id: currentSessionId,
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Échec de l\'envoi du message. Veuillez réessayer.',
        latency_ms: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !sessionId) return;
    const userMessage = input.trim();
    setInput('');
    await sendMessageToBot(userMessage, sessionId);
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  async function handleExampleQuestion() {
    if (!sessionId) return;
    const exampleMessage = 'Bonjour ! Comment peux-tu m\'aider ?';
    setInput('');
    await sendMessageToBot(exampleMessage, sessionId);
  }

  const rgb = hexToRgbString(primaryColor);
  const iconFilter = getIconFilter(primaryColor);

  return (
    <div className="flex flex-col h-full bg-white">
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-6"
        style={{ overscrollBehavior: 'contain' }}
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-8">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-3xl blur-2xl opacity-20 animate-pulse"
                style={{ background: `rgba(${rgb}, 0.6)` }}
              />
              <div
                className="relative p-6 rounded-3xl shadow-xl"
                style={{ background: primaryColor }}
              >
                <img
                  src="/chat-bubbles-svgrepo-com.svg"
                  alt="Chat"
                  className="w-14 h-14 object-contain"
                  style={{ filter: iconFilter }}
                />
              </div>
            </div>
            <div className="text-center space-y-3 max-w-md">
              <h2 className="text-2xl font-bold text-slate-800">
                Comment puis-je vous aider ?
              </h2>
              <p className="text-slate-500 leading-relaxed text-sm">
                Posez-moi n'importe quelle question et je vous répondrai en me basant sur mes connaissances
              </p>
            </div>
            <button
              onClick={handleExampleQuestion}
              className="px-5 py-2.5 text-white rounded-xl shadow-sm transition font-medium text-sm hover:opacity-90"
              style={{ background: primaryColor }}
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              Exemple de question
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 self-end mb-1"
                    style={{ background: primaryColor }}
                  >
                    <img
                      src="/chat-bubbles-svgrepo-com.svg"
                      alt="Bot"
                      className="w-4 h-4 object-contain"
                      style={{ filter: iconFilter }}
                    />
                  </div>
                )}
                <div
                  className={`max-w-[72%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${
                    message.role === 'user'
                      ? 'text-white rounded-t-2xl rounded-bl-2xl rounded-br-md'
                      : 'bg-slate-50 text-slate-800 border border-slate-200 rounded-t-2xl rounded-br-2xl rounded-bl-md'
                  }`}
                  style={message.role === 'user' ? { background: primaryColor } : {}}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 self-end mb-1"
                  style={{ background: primaryColor }}
                >
                  <img
                    src="/chat-bubbles-svgrepo-com.svg"
                    alt="Bot"
                    className="w-4 h-4 object-contain"
                    style={{ filter: iconFilter }}
                  />
                </div>
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-t-2xl rounded-br-2xl rounded-bl-md">
                  <div className="flex gap-1 items-center h-4">
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: primaryColor, animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: primaryColor, animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full animate-bounce" style={{ background: primaryColor, animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-white p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Écrivez votre message..."
            disabled={loading || !sessionId}
            className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 disabled:opacity-50 bg-white text-slate-800 placeholder:text-slate-400 text-sm"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || !sessionId}
            className="px-4 py-2.5 text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:opacity-90 flex items-center justify-center"
            style={{ background: primaryColor }}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
