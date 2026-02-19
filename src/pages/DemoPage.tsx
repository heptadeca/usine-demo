import { useEffect, useState } from 'react';
import { ChatWidget } from '../components/ChatWidget';
import { supabase } from '../lib/supabase';

type DemoPageProps = {
  botId: string;
};

const DEFAULT_COLOR = '#8eb4e3';

export function DemoPage({ botId }: DemoPageProps) {
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLOR);

  useEffect(() => {
    supabase
      .from('bots')
      .select('primary_color')
      .eq('id', botId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.primary_color) setPrimaryColor(data.primary_color);
      });
  }, [botId]);

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="border-b border-slate-100 px-4 py-3 flex items-center gap-3" style={{ background: primaryColor }}>
        <div className="bg-white/20 p-1.5 rounded-lg">
          <img src="/image.png" alt="Chat" className="w-6 h-6 object-contain" />
        </div>
        <div>
          <h1 className="font-semibold text-white text-sm">Besoin d'infos ? Besoin d'aide ?</h1>
          <p className="text-xs text-white/80">Je réponds à vos questions…</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatWidget botId={botId} primaryColor={primaryColor} />
      </div>
    </div>
  );
}
