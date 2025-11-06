import { useState } from 'react';
import { MessageCircle, X, Minimize2 } from 'lucide-react';
import { ChatWidget } from './ChatWidget';

type ChatBubbleProps = {
  botId: string;
};

export function ChatBubble({ botId }: ChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <>
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 ${
            isMinimized
              ? 'bottom-24 right-6 w-80 h-16'
              : 'bottom-24 right-6 w-[400px] h-[600px]'
          }`}
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 h-full flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white">
                <MessageCircle className="w-5 h-5" />
                <span className="font-semibold">Assistant de Chat</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="text-white hover:bg-white/20 p-1 rounded transition"
                  title={isMinimized ? 'Étendre' : 'Réduire'}
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setIsMinimized(false);
                  }}
                  className="text-white hover:bg-white/20 p-1 rounded transition"
                  title="Fermer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {!isMinimized && (
              <div className="flex-1 overflow-hidden">
                <ChatWidget botId={botId} />
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-full shadow-2xl transition-all duration-300 ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
        aria-label="Ouvrir le chat"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    </>
  );
}
