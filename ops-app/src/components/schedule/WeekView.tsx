'use client';

import { ScheduleEvent, StaffMember } from '@/lib/types';
import { ProductionCard } from './ProductionCard';
import { cn } from '@/lib/utils';

// Helper to get week days
function getWeekDays(currentDate: Date) {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    start.setDate(diff);

    const days = [];
    for (let i = 0; i < 5; i++) { // Mon-Fri
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
    }
    return days;
}

interface WeekViewProps {
    currentDate: Date;
    events: ScheduleEvent[];
    staff: StaffMember[];
    onEventMove: (id: string, date: string) => Promise<void>;
}

export function WeekView({ currentDate, events, staff }: WeekViewProps) {
    const days = getWeekDays(currentDate);
    const hours = Array.from({ length: 11 }, (_, i) => i + 7); // 7 AM to 5 PM

    return (
        <div className="flex flex-col h-full bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            {/* Header Row */}
            <div className="flex border-b border-slate-200 bg-slate-50">
                <div className="w-16 shrink-0 border-r border-slate-200"></div>
                {days.map((day) => {
                    const isToday = new Date().toDateString() === day.toDateString();
                    // Mock load level logic
                    const loadLevel = Math.random() > 0.7 ? 'Heavy' : 'Normal';
                    const isHeavy = loadLevel === 'Heavy';

                    return (
                        <div key={day.toISOString()} className={cn("flex-1 p-3 text-center border-r border-slate-200 last:border-0 relative", isHeavy && "bg-amber-50/50")}>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            <div className={cn("text-xl font-bold font-mono transition-colors", isToday ? "text-blue-600" : "text-slate-800")}>
                                {day.getDate()}
                            </div>
                            {isToday && <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />}
                            {isHeavy && <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-400 opacity-50" />}
                        </div>
                    );
                })}
            </div>

            {/* Grid Body */}
            <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                <div className="flex min-h-[800px]">
                    {/* Time Column */}
                    <div className="w-16 shrink-0 border-r border-slate-200 bg-slate-50">
                        {hours.map(hour => (
                            <div key={hour} className="h-24 border-b border-slate-200 text-xs font-mono text-slate-400 p-2 text-right relative">
                                {hour}:00
                            </div>
                        ))}
                    </div>

                    {/* Day Columns */}
                    {days.map((day) => {
                        // Filter events for this day
                        const dayEvents = events.filter(e => {
                            const eDate = new Date(e.start_date);
                            return eDate.getDate() === day.getDate() &&
                                eDate.getMonth() === day.getMonth();
                        });

                        return (
                            <div key={day.toISOString()} className="flex-1 border-r border-slate-200 last:border-0 relative">
                                {/* Grid Lines */}
                                {hours.map(hour => (
                                    <div key={hour} className="h-24 border-b border-slate-100/50" />
                                ))}

                                {/* Events Layer */}
                                {dayEvents.map(event => {
                                    const start = new Date(event.start_date);
                                    const end = new Date(event.end_date || event.start_date);
                                    const startHour = start.getHours();
                                    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

                                    // Calculate Position
                                    const topOffset = (startHour - 7) * 96; // 96px = h-24 = 6rem
                                    const height = Math.max(durationHours * 96, 48); // Min 30m

                                    if (startHour < 7 || startHour > 17) return null; // Out of bounds for this view

                                    return (
                                        <div
                                            key={event.id}
                                            className="absolute w-[95%] left-[2.5%] transition-all z-10 hover:z-20"
                                            style={{ top: `${topOffset}px`, height: `${height}px` }}
                                        >
                                            <ProductionCard event={event} staff={staff} />
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
