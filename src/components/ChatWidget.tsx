import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Message } from '../lib/supabase';

type ChatWidgetProps = {
  botId: string;
  token?: string;
};

export function ChatWidget({ botId, token }: ChatWidgetProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    createSession();
  }, [botId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  async function createSession() {
    try {
      const { data: session, error } = await supabase
        .from('sessions')
        .insert({ bot_id: botId })
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
        throw new Error('Bot introuvable');
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
        throw new Error('Échec de la récupération de la réponse du service de chat');
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      let responseContent = data.output || data.answer || data.response || 'Aucune réponse';

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
        content: error instanceof Error ? error.message : 'Échec de l\'envoi du message. Veuillez réessayer.',
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

  async function handleExampleQuestion() {
    const exampleMessage = 'Bonjour ! Comment peux-tu m\'aider ?';
    setInput(exampleMessage);

    if (!sessionId) return;

    setLoading(true);

    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: exampleMessage,
      latency_ms: null,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setInput('');

    try {
      await supabase.from('messages').insert({
        session_id: sessionId,
        role: 'user',
        content: exampleMessage,
      });

      const { data: bot } = await supabase
        .from('bots')
        .select('n8n_chat_url, prompt')
        .eq('id', botId)
        .maybeSingle();

      if (!bot) {
        throw new Error('Bot introuvable');
      }

      const startTime = Date.now();
      const chatUrl = bot.n8n_chat_url || 'https://n8n.prcz.fr/webhook/lacroix-chat';

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: botId,
          session_id: sessionId,
          message: exampleMessage,
          prompt: bot.prompt || '',
          k: 8,
          temperature: 0.2,
          max_tokens: 350,
        }),
      });

      if (!response.ok) {
        throw new Error('Échec de la récupération de la réponse du service de chat');
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      let responseContent = data.output || data.answer || data.response || 'Aucune réponse';

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
        content: error instanceof Error ? error.message : 'Échec de l\'envoi du message. Veuillez réessayer.',
        latency_ms: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-indigo-50/30 to-white">
      <div className="flex-1 overflow-y-auto p-8">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-8">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 p-8 rounded-3xl shadow-2xl">
                <MessageCircle className="w-16 h-16 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <div className="text-center space-y-3 max-w-md">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Comment puis-je vous aider ?
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Posez-moi n'importe quelle question et je vous répondrai en me basant sur mes connaissances
              </p>
            </div>
            <div className="flex flex-wrap gap-3 justify-center max-w-2xl">
              <button
                onClick={handleExampleQuestion}
                className="px-4 py-2 bg-white hover:bg-indigo-50 text-indigo-600 rounded-xl shadow-sm border border-indigo-100 transition font-medium text-sm"
              >
                <Sparkles className="w-4 h-4 inline mr-2" />
                Exemple de question
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl rounded-bl-2xl rounded-br-md'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-t-2xl rounded-br-2xl rounded-bl-md'
                  } shadow-sm`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  {message.latency_ms && (
                    <p className="text-xs mt-1.5 opacity-60">{message.latency_ms}ms</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-indigo-100 bg-white/80 backdrop-blur-sm p-6">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Écrivez votre message..."
            disabled={loading || !sessionId}
            className="flex-1 px-5 py-3 border border-indigo-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none disabled:opacity-50 bg-white shadow-sm font-medium text-slate-800 placeholder:text-slate-400"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim() || !sessionId}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl font-medium"
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
