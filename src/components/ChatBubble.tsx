import { useState } from 'react';
import { X, Minimize2 } from 'lucide-react';
import { ChatWidget } from './ChatWidget';

type ChatBubbleProps = {
  botId: string;
  primaryColor?: string;
};

const DEFAULT_COLOR = '#8eb4e3';

export function ChatBubble({ botId, primaryColor = DEFAULT_COLOR }: ChatBubbleProps) {
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
            <div
              className="px-4 py-3 flex items-center justify-between"
              style={{ background: primaryColor }}
            >
              <div className="flex items-center gap-2 text-white">
                <div className="bg-white/20 rounded-lg p-1">
                  <img src="/image.png" alt="Chat" className="w-4 h-4 object-contain" />
                </div>
                <span className="font-semibold text-sm">Assistant de Chat</span>
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
                <ChatWidget botId={botId} primaryColor={primaryColor} />
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 text-white p-4 rounded-full shadow-2xl transition-all duration-300 hover:opacity-90 ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
        style={{ background: primaryColor }}
        aria-label="Ouvrir le chat"
      >
        <img src="/image.png" alt="Chat" className="w-6 h-6 object-contain" />
      </button>
    </>
  );
}
