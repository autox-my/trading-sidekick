import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../store/useChatStore';
import { useUIStore } from '../../store/useUIStore';
import {
    Send,
    Bot,
    ShieldAlert,
    Trash2,
    X,
    BookOpen,
    GripHorizontal
} from 'lucide-react';
import { PERSONALITIES } from '../../utils/constants';
import { MarkdownRenderer } from '../MarkdownRenderer';

export const SidekickPanel: React.FC = () => {
    const { messages, input, personality, setInput, sendMessage, setPersonality } = useChatStore();
    const { isSidebarOpen, setIsSidebarOpen } = useUIStore();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Dragging State
    const [position, setPosition] = useState({ x: window.innerWidth - 420, y: 80 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    // Resizing State
    const [size, setSize] = useState({ width: 400, height: 600 });
    const [isResizing, setIsResizing] = useState(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (text?: string, mode?: string) => {
        setIsLoading(true);
        await sendMessage(text, mode);
        setIsLoading(false);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('.resize-handle')) return;
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.current.x,
                    y: e.clientY - dragOffset.current.y
                });
            }
            if (isResizing) {
                setSize({
                    width: Math.max(300, e.clientX - position.x),
                    height: Math.max(400, e.clientY - position.y)
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, position]);

    // Reset position if window resizes significantly or on open
    useEffect(() => {
        if (isSidebarOpen) {
            // Ensure it's on screen
            setPosition(prev => ({
                x: Math.min(Math.max(0, prev.x), window.innerWidth - size.width),
                y: Math.min(Math.max(0, prev.y), window.innerHeight - size.height)
            }));
        }
    }, [isSidebarOpen, size.width, size.height]);

    if (!isSidebarOpen) return null;

    return (
        <div
            className="fixed z-50 flex flex-col transition-opacity duration-300 ease-out"
            style={{
                left: position.x,
                top: position.y,
                width: size.width,
                height: size.height,
                opacity: isSidebarOpen ? 1 : 0,
                pointerEvents: isSidebarOpen ? 'auto' : 'none'
            }}
        >
            {/* Glass Container */}
            <div className="flex-1 flex flex-col bg-secondary/90 backdrop-blur-2xl border border-[rgba(var(--glass-border),0.3)] rounded-3xl shadow-2xl overflow-hidden relative">

                {/* Header (Drag Handle) */}
                <div
                    className="flex items-center justify-between p-4 border-b border-[rgba(var(--glass-border),0.1)] bg-white/5 cursor-move select-none"
                    onMouseDown={handleMouseDown}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Bot size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-text-primary tracking-wide">Sidekick AI</h2>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Online</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <GripHorizontal size={16} className="text-text-secondary mr-2" />
                        <button onClick={() => useChatStore.getState().setMessages([])} className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded-xl transition-all" title="Clear Chat"><Trash2 size={16} /></button>
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded-xl transition-all"><X size={16} /></button>
                    </div>
                </div>

                {/* Persona Selector (Compact) */}
                <div className="px-4 py-3 border-b border-[rgba(var(--glass-border),0.1)] bg-secondary/30">
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                        {Object.entries(PERSONALITIES).map(([key, p]: any) => (
                            <button
                                key={key}
                                onClick={() => setPersonality(p)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${personality.id === p.id ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : 'bg-white/5 border-transparent text-text-secondary hover:bg-white/10 hover:text-text-primary'}`}
                            >
                                {p.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center opacity-70">
                            <Bot size={48} className="text-text-secondary mb-4" />
                            <p className="text-sm text-text-primary font-medium max-w-[200px]">I'm ready to analyze the market. Select a mode or ask me anything.</p>
                        </div>
                    )}
                    {messages.map((msg, i) => (
                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`max-w-[85%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-secondary/80 text-text-primary rounded-bl-none border border-[rgba(var(--glass-border),0.2)]'}`}>
                                <MarkdownRenderer content={msg.text} />
                            </div>
                            {msg.suggestions && (
                                <div className="flex flex-wrap gap-2 mt-2 ml-1">
                                    {msg.suggestions.map((s, idx) => (
                                        <button key={idx} onClick={() => handleSendMessage(s)} className="text-[10px] px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 rounded-lg transition-all">
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 ml-2 animate-pulse">
                            <Bot size={14} /> Analyzing market data...
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Chart Type Selector */}
                <div className="mb-6 p-1 bg-secondary/50 rounded-xl border border-[rgba(var(--glass-border),0.2)] flex gap-1"></div>

                {/* Input Area */}
                <div className="p-4 bg-secondary/30 border-t border-[rgba(var(--glass-border),0.1)] backdrop-blur-md relative">
                    {/* Quick Actions */}
                    <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
                        <button onClick={() => handleSendMessage(undefined, 'devil')} className="whitespace-nowrap px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-[10px] font-bold text-rose-300 border border-rose-500/20 rounded-lg transition-all flex items-center gap-1.5"><ShieldAlert size={12} /> Stress Test</button>
                        <button
                            onClick={() => handleSendMessage("Generate a structured trade plan for this asset based on current technicals.", 'playbook')}
                            className="whitespace-nowrap px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-[10px] font-bold text-emerald-300 border border-emerald-500/20 rounded-lg transition-all flex items-center gap-1.5"
                        >
                            <BookOpen size={12} /> Playbook
                        </button>
                    </div>

                    <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask Sidekick..."
                            className="w-full bg-secondary/50 border border-[rgba(var(--glass-border),0.2)] rounded-xl py-3 pl-4 pr-12 text-sm text-text-primary placeholder-text-secondary font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="absolute right-1.5 top-1.5 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <Send size={16} />
                        </button>
                    </form>

                    {/* Resize Handle */}
                    <div
                        className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize resize-handle flex items-end justify-end p-1"
                        onMouseDown={handleResizeMouseDown}
                    >
                        <div className="w-2 h-2 bg-slate-500/50 rounded-br-sm"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

