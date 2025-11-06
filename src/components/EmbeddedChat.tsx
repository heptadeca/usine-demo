import { ChatWidget } from './ChatWidget';

type EmbeddedChatProps = {
  botId: string;
  title?: string;
  description?: string;
};

export function EmbeddedChat({ botId, title = 'Chattez avec nous', description }: EmbeddedChatProps) {
  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
      {(title || description) && (
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          {description && (
            <p className="text-sm text-slate-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="h-[500px]">
        <ChatWidget botId={botId} />
      </div>
    </div>
  );
}
