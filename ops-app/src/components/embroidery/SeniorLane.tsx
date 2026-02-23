import { EmbroideryBatch } from '@/lib/types';
import { SeniorBatchCard } from './SeniorBatchCard';
import { Sparkles, Trophy } from 'lucide-react';

interface SeniorLaneProps {
    batches: EmbroideryBatch[];
    onOpen: (batch: EmbroideryBatch) => void;
}

export function SeniorLane({ batches, onOpen }: SeniorLaneProps) {
    const seniorBatches = batches.filter(b => b.is_senior_batch);

    if (seniorBatches.length === 0) return null;

    return (
        <div className="mt-8 pt-8 border-t-4 border-purple-100 relative">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="bg-purple-100 p-3 rounded-xl">
                        <Trophy className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            Senior Embroidery Campaigns <Sparkles className="w-4 h-4 text-amber-500" />
                        </h2>
                        <p className="text-slate-500">Coordinated graduation uniform production.</p>
                    </div>
                </div>
                <div className="text-sm font-bold text-purple-700 bg-purple-50 px-4 py-2 rounded-lg border border-purple-100">
                    {seniorBatches.length} Active Campaigns
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {seniorBatches.map(batch => (
                    <SeniorBatchCard
                        key={batch.school_name}
                        batch={batch}
                        onOpen={onOpen}
                    />
                ))}
            </div>
        </div>
    );
}
