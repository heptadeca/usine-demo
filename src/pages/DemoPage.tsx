import { ChatWidget } from '../components/ChatWidget';
import { Bot } from 'lucide-react';

type DemoPageProps = {
  botId: string;
};

export function DemoPage({ botId }: DemoPageProps) {
  return (
    <div className="h-screen flex flex-col bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-900">Besoin d'infos ? Besoin d'aide ?</h1>
            <p className="text-xs text-slate-600">Propulsé par RAG</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatWidget botId={botId} />
      </div>
    </div>
  );
}
