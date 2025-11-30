import React from 'react';
import { Settings, ExternalLink } from 'lucide-react';
import { useUIStore } from '../../store/useUIStore';
import { useMarketStore } from '../../store/useMarketStore';

export const OptionsFlow: React.FC = () => {
    const {
        viewMode,
        externalToolUrl,
        setExternalToolUrl,
        isEditingUrl,
        setIsEditingUrl
    } = useUIStore();

    const { lastDataUpdate } = useMarketStore();

    const saveToolUrl = (url: string) => {
        setExternalToolUrl(url);
        setIsEditingUrl(false);
    };

    return (
        <div className={`w-full h-full absolute inset-0 flex flex-col bg-black ${viewMode === 'options_flow' ? 'z-10 opacity-100 pointer-events-auto' : 'z-0 opacity-0 pointer-events-none'}`}>
            <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center px-6 gap-4">
                <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border ${lastDataUpdate ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-800 border-white/5 text-slate-500'}`}>
                    <div className={`w-2 h-2 rounded-full ${lastDataUpdate ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`}></div>
                    <span className="text-[11px] font-bold uppercase tracking-wider">{lastDataUpdate ? `Live Stream` : 'Waiting for Signal'}</span>
                </div>
                {isEditingUrl ? (
                    <form className="flex-1 flex gap-3" onSubmit={(e) => { e.preventDefault(); saveToolUrl(externalToolUrl); }}>
                        <input type="text" value={externalToolUrl} onChange={(e) => setExternalToolUrl(e.target.value)} className="flex-1 bg-slate-950 border border-slate-700 text-xs text-white px-3 py-2 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none" autoFocus />
                        <button type="submit" className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">Save Source</button>
                    </form>
                ) : (
                    <div className="flex-1 flex items-center gap-3 group cursor-pointer p-2 rounded-lg hover:bg-white/5 transition-colors" onClick={() => setIsEditingUrl(true)}>
                        <span className="text-xs text-slate-500 font-medium">Source:</span>
                        <span className="text-xs text-slate-300 font-mono truncate max-w-[300px]">{externalToolUrl}</span>
                        <Settings size={14} className="text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                )}
                <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
                    <a href={externalToolUrl} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors" title="Open in New Tab"><ExternalLink size={16} /></a>
                </div>
            </div>
            <div className="flex-1 relative bg-[#0a0e17]">
                <iframe src={externalToolUrl} className="w-full h-full border-0" title="Options Flow Analyzer" />
            </div>
        </div>
    );
};
