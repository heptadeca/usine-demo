import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, ArrowLeft, MoreVertical } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Message = {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  latency_ms: number | null;
  created_at: string;
};

type WhatsAppChatProps = {
  botId: string;
  botName?: string;
  onBack?: () => void;
};

export function WhatsAppChat({ botId, botName = 'Assistant', onBack }: WhatsAppChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initSession();
  }, [botId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function initSession() {
    const { data } = await supabase
      .from('sessions')
      .insert({ bot_id: botId })
      .select()
      .single();

    if (data) {
      setSessionId(data.id);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !sessionId) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: userMessage,
      latency_ms: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);

    try {
      await supabase.from('messages').insert({
        session_id: sessionId,
        role: 'user',
        content: userMessage,
      });

      const { data: bot } = await supabase
        .from('bots')
        .select('n8n_chat_url, prompt')
        .eq('id', botId)
        .maybeSingle();

      if (!bot) {
        throw new Error('Bot not found');
      }

      const startTime = Date.now();
      const chatUrl = bot.n8n_chat_url || 'https://n8n.prcz.fr/webhook/lacroix-chat';

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: botId,
          session_id: sessionId,
          message: userMessage,
          prompt: bot.prompt || '',
          k: 8,
          temperature: 0.2,
          max_tokens: 350,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response from chat service');
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      let responseContent = data.output || data.answer || data.response || 'No response';

      if (typeof responseContent === 'object') {
        responseContent = responseContent.output || JSON.stringify(responseContent);
      }

      responseContent = String(responseContent);

      await supabase.from('messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: responseContent,
        latency_ms: latencyMs,
      });

      const assistantMessage: Message = {
        id: `temp-${Date.now()}-assistant`,
        session_id: sessionId,
        role: 'assistant',
        content: responseContent,
        latency_ms: latencyMs,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: `temp-${Date.now()}-error`,
        session_id: sessionId,
        role: 'assistant',
        content: error instanceof Error ? error.message : 'Failed to send message. Please try again.',
        latency_ms: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-screen bg-[#e5ddd5]">
      <div className="bg-[#075e54] text-white px-4 py-3 flex items-center gap-3 shadow-md">
        {onBack && (
          <button onClick={onBack} className="hover:bg-white/10 p-2 rounded-full transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold">
          {botName[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="font-medium">{botName}</h1>
          <p className="text-xs text-white/70">En ligne</p>
        </div>
        <button className="hover:bg-white/10 p-2 rounded-full transition">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-slate-500">
              <p>Aucun message pour le moment</p>
              <p className="text-sm mt-1">Commencez une conversation !</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-3 py-2 rounded-lg shadow-sm ${
                  message.role === 'user'
                    ? 'bg-[#dcf8c6] text-slate-800'
                    : 'bg-white text-slate-800'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="text-[10px] text-slate-500">
                    {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-[#f0f0f0] px-3 py-2">
        <div className="flex gap-2 items-center bg-white rounded-full px-4 py-2 shadow-sm">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Message"
            disabled={loading || !sessionId}
            className="flex-1 outline-none bg-transparent text-sm"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || !sessionId}
            className="text-[#075e54] disabled:opacity-40 transition"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
