'use client';

import { useChat } from '@ai-sdk/react';
import { Send, Bot, User } from 'lucide-react';
import { useRef, useEffect, useState } from 'react';

export default function ChatInterface() {
    const [input, setInput] = useState('');
    const { messages, sendMessage, status } = useChat();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const isLoading = status === 'streaming';

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const currentInput = input;
        setInput('');
        await sendMessage({ text: currentInput });
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="flex flex-col h-[calc(100vh-8rem)] w-full max-w-4xl mx-auto border border-zinc-200 rounded-lg shadow-sm bg-white overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-2">
                        <Bot size={48} className="opacity-20" />
                        <p>Ask me anything about your operations data.</p>
                    </div>
                )}
                {messages.map((m: any) => (
                    <div
                        key={m.id}
                        className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                    >
                        <div
                            className={`flex items-start max-w-[80%] ${m.role === 'user'
                                ? 'flex-row-reverse'
                                : 'flex-row'
                                }`}
                        >
                            <div
                                className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${m.role === 'user'
                                    ? 'bg-blue-600 text-white ml-2'
                                    : 'bg-zinc-100 text-zinc-600 mr-2'
                                    }`}
                            >
                                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div
                                className={`p-3 rounded-lg text-sm ${m.role === 'user'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-zinc-100 text-zinc-800'
                                    }`}
                            >
                                {m.content}
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-zinc-200 bg-zinc-50">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <input
                        className="flex-1 p-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-zinc-900"
                        value={input}
                        placeholder="Search orders, products, or ask about schools..."
                        onChange={handleInputChange}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>
    );
}
