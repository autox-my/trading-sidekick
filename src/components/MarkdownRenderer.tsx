import { Terminal } from 'lucide-react';

const parseInline = (text: string) => {
    if (typeof text !== 'string') return text;
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="font-bold text-indigo-400">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={i} className="italic text-text-secondary">{part.slice(1, -1)}</em>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="bg-secondary/50 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-xs border border-indigo-500/20">{part.slice(1, -1)}</code>;
        }
        return part;
    });
};

const TableBlock = ({ lines }: { lines: string[] }) => {
    if (lines.length < 2) return null;
    const headers = lines[0].split('|').map(c => c.trim()).filter(c => c);
    const bodyLines = lines.slice(2);

    return (
        <div className="overflow-x-auto my-3 rounded-lg border border-[rgba(var(--glass-border),0.2)] bg-secondary/30 animate-popIn">
            <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-secondary/50 text-text-secondary">
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} className="p-2 border-b border-r border-[rgba(var(--glass-border),0.1)] last:border-r-0 font-medium uppercase tracking-wider text-[10px] text-text-secondary">
                                {parseInline(h)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="text-text-secondary font-mono">
                    {bodyLines.map((line, i) => {
                        const cells = line.split('|').map(c => c.trim()).filter(c => c);
                        return (
                            <tr key={i} className="border-b border-[rgba(var(--glass-border),0.1)] last:border-0 hover:bg-white/5 transition-colors">
                                {cells.map((c, j) => (
                                    <td key={j} className="p-2 border-r border-[rgba(var(--glass-border),0.1)] last:border-r-0">
                                        {parseInline(c)}
                                    </td>
                                ))}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const PlaybookCard = ({ data }: { data: any }) => {
    return (
        <div className="my-4 bg-secondary/80 border border-indigo-500/20 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(99,102,241,0.1)] animate-popIn font-sans">
            <div className="bg-secondary/50 px-4 py-2.5 border-b border-indigo-500/20 flex justify-between items-center">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-[10px] uppercase tracking-widest">
                    <Terminal size={12} className="text-indigo-400" /> Trade Plan
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] text-text-secondary uppercase font-bold tracking-wider">CONFIDENCE</span>
                    <div className="flex gap-0.5">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className={`w-1 h-2 rounded-sm transition-all duration-500 ${i < data.conviction ? (data.conviction >= 8 ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.5)]' : data.conviction >= 5 ? 'bg-amber-400' : 'bg-rose-400') : 'bg-slate-700/50'}`} />
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-5 space-y-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-secondary/40 border border-emerald-500/20 p-3 rounded hover:bg-emerald-500/10 transition-all group">
                        <div className="text-[9px] text-emerald-500/80 uppercase font-bold mb-1 tracking-widest group-hover:text-emerald-400">ENTRY</div>
                        <div className="text-xs font-bold text-emerald-400 shadow-emerald-900/20 font-mono">{data.entry}</div>
                    </div>
                    <div className="bg-secondary/40 border border-rose-500/20 p-3 rounded hover:bg-rose-500/10 transition-all group">
                        <div className="text-[9px] text-rose-500/80 uppercase font-bold mb-1 tracking-widest group-hover:text-rose-400">STOP</div>
                        <div className="text-xs font-bold text-rose-400 font-mono">{data.stop}</div>
                    </div>
                    <div className="bg-secondary/40 border border-blue-500/20 p-3 rounded hover:bg-blue-500/10 transition-all group">
                        <div className="text-[9px] text-blue-500/80 uppercase font-bold mb-1 tracking-widest group-hover:text-blue-400">TARGET</div>
                        <div className="text-xs font-bold text-blue-400 font-mono">{data.target}</div>
                    </div>
                </div>
                {data.reasoning && (
                    <div className="text-xs text-text-secondary italic border-l-2 border-indigo-500/30 pl-4 py-1 leading-relaxed">
                        <span className="text-indigo-500 font-bold not-italic mr-2">{'>'}</span>
                        {data.reasoning}
                    </div>
                )}
            </div>
        </div>
    );
};

export const MarkdownRenderer = ({ content }: { content: string }) => {
    if (!content) return null;

    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();

    if (cleanContent.startsWith('{') && cleanContent.includes('"entry"')) {
        try {
            const data = JSON.parse(cleanContent);
            return <PlaybookCard data={data} />;
        } catch (e) { }
    }

    const parts = content.split(/(```[\s\S]*?```)/g);

    return (
        <div className="text-sm leading-7 space-y-2 font-light tracking-wide text-text-primary">
            {parts.map((part, i) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    const codeContent = part.slice(3, -3).replace(/^.*\n/, '');
                    return (
                        <div key={i} className="bg-secondary/80 p-4 rounded-lg border border-[rgba(var(--glass-border),0.2)] font-mono text-xs overflow-x-auto my-3 text-indigo-300 shadow-inner animate-slideUp">
                            <pre>{codeContent.trim()}</pre>
                        </div>
                    );
                }

                const lines = part.split('\n');
                const elements: React.ReactNode[] = [];
                let tableBuffer: string[] = [];

                const flushTable = () => {
                    if (tableBuffer.length > 0) {
                        elements.push(<TableBlock key={`table-${i}-${elements.length}`} lines={tableBuffer} />);
                        tableBuffer = [];
                    }
                };

                lines.forEach((line, j) => {
                    const trimmed = line.trim();

                    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                        tableBuffer.push(trimmed);
                        return;
                    } else {
                        flushTable();
                    }

                    if (!trimmed) {
                        elements.push(<div key={`${i}-${j}`} className="h-3" />);
                        return;
                    }

                    if (trimmed.startsWith('#### ')) {
                        elements.push(
                            <h4 key={`${i}-${j}`} className="text-xs font-bold text-text-secondary mt-4 mb-2 uppercase tracking-widest border-l-2 border-indigo-500/50 pl-3">
                                {parseInline(trimmed.substring(5))}
                            </h4>
                        );
                    } else if (trimmed.startsWith('### ')) {
                        elements.push(
                            <h3 key={`${i}-${j}`} className="text-sm font-bold text-indigo-400 mt-5 mb-2 uppercase tracking-widest">
                                {parseInline(trimmed.substring(4))}
                            </h3>
                        );
                    } else if (trimmed.startsWith('## ')) {
                        elements.push(
                            <h2 key={`${i}-${j}`} className="text-base font-bold text-text-primary mt-6 mb-3 pb-2 border-b border-[rgba(var(--glass-border),0.1)] flex items-center gap-2">
                                <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                                {parseInline(trimmed.substring(3))}
                            </h2>
                        );
                    } else if (trimmed.startsWith('# ')) {
                        elements.push(
                            <h1 key={`${i}-${j}`} className="text-xl font-bold text-text-primary mt-6 mb-4">
                                {parseInline(trimmed.substring(2))}
                            </h1>
                        );
                    }
                    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                        elements.push(
                            <div key={`${i}-${j}`} className="flex gap-3 ml-1">
                                <span className="text-indigo-500/60 mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500/60 shrink-0 block"></span>
                                <span className="text-text-primary">{parseInline(trimmed.substring(2))}</span>
                            </div>
                        );
                    } else if (/^\d+\.\s/.test(trimmed)) {
                        elements.push(
                            <div key={`${i}-${j}`} className="flex gap-3 ml-1">
                                <span className="text-indigo-400 font-mono text-xs mt-1">{trimmed.match(/^\d+\./)?.[0]}</span>
                                <span className="text-text-primary">{parseInline(trimmed.replace(/^\d+\.\s/, ''))}</span>
                            </div>
                        );
                    }
                    else {
                        elements.push(<div key={`${i}-${j}`}>{parseInline(trimmed)}</div>);
                    }
                });

                flushTable();
                return <div key={i}>{elements}</div>;
            })}
        </div>
    );
};
