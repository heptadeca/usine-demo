import { ChatWidget } from './ChatWidget';

type EmbeddedChatProps = {
  botId: string;
  title?: string;
  description?: string;
  primaryColor?: string;
};

export function EmbeddedChat({ botId, title = 'Chattez avec nous', description, primaryColor }: EmbeddedChatProps) {
  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {(title || description) && (
        <div className="px-6 py-4 border-b border-slate-200" style={primaryColor ? { background: primaryColor } : { background: 'linear-gradient(to right, #f8fafc, #f1f5f9)' }}>
          <h2 className="text-xl font-bold" style={primaryColor ? { color: 'white' } : { color: '#0f172a' }}>{title}</h2>
          {description && (
            <p className="text-sm mt-1" style={primaryColor ? { color: 'rgba(255,255,255,0.8)' } : { color: '#475569' }}>{description}</p>
          )}
        </div>
      )}
      <div className="h-[500px]">
        <ChatWidget botId={botId} primaryColor={primaryColor} />
      </div>
    </div>
  );
}
