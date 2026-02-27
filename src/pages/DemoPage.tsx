import { useEffect, useState } from 'react';
import { ChatWidget } from '../components/ChatWidget';
import { supabase } from '../lib/supabase';
import { getIconFilter } from '../lib/colorUtils';

type DemoPageProps = {
  botId: string;
};

const DEFAULT_COLOR = '#8eb4e3';

export function DemoPage({ botId }: DemoPageProps) {
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLOR);

  useEffect(() => {
    // Check for primaryColor in URL first to avoid lag
    const urlParams = new URLSearchParams(window.location.search);
    const urlColor = urlParams.get('primaryColor');
    if (urlColor) {
      setPrimaryColor(urlColor);
      return;
    }

    supabase
      .from('bots')
      .select('primary_color')
      .eq('id', botId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.primary_color) setPrimaryColor(data.primary_color);
      });
  }, [botId]);

  const iconFilter = getIconFilter(primaryColor);

  return (
    <div className="h-screen flex flex-col bg-white rounded-2xl overflow-hidden" style={{ border: `2px solid ${primaryColor}` }}>
      <div className="px-4 py-3 flex items-center gap-3 border-b" style={{ background: 'white', borderColor: `${primaryColor}33` }}>
        <div className="p-1.5 rounded-lg" style={{ background: primaryColor + '1a' }}>
          <img
            src="/chat-bubbles-svgrepo-com.svg"
            alt="Chat"
            className="w-6 h-6 object-contain"
            style={{ filter: iconFilter }}
          />
        </div>
        <div>
          <h1 className="font-semibold text-sm" style={{ color: primaryColor }}>Besoin d'infos ? Besoin d'aide ?</h1>
          <p className="text-xs text-slate-400">Je réponds à vos questions…</p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatWidget botId={botId} primaryColor={primaryColor} />
      </div>
    </div>
  );
}
