import ChatInterface from '@/components/ai/ChatInterface';

export default function AIBotPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">AI Operations Assistant</h1>
                    <p className="text-zinc-500 text-sm mt-1">
                        Ask questions about orders, products, schools, and production status.
                    </p>
                </div>
            </div>

            <ChatInterface />
        </div>
    );
}
