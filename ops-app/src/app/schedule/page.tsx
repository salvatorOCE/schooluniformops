'use client';

import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useData } from '@/lib/data-provider';
import { ScheduleEvent, StaffMember } from '@/lib/types';
import { CalendarEngine, CalendarRef } from '@/components/schedule/CalendarEngine';
import { DraggableSidebar } from '@/components/schedule/DraggableSidebar';
import { JobModal, JobFormData } from '@/components/schedule/JobModal';
import { Plus } from 'lucide-react';

export default function SchedulePage() {
    const adapter = useData();
    const calendarRef = useRef<CalendarRef>(null);
    const [events, setEvents] = useState<ScheduleEvent[]>([]);
    const [staff, setStaff] = useState<StaffMember[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedJob, setSelectedJob] = useState<JobFormData | undefined>(undefined);

    // Initial Load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        const [evts, stf] = await Promise.all([
            adapter.getScheduleEvents(start, end),
            adapter.getStaff()
        ]);
        setEvents(evts);
        setStaff(stf);
    };

    // --- Handlers ---

    const handleEventDrop = async (id: string, start: Date, end: Date) => {
        const event = events.find(e => e.id === id);
        if (!event) return;

        const updated = {
            ...event,
            start_date: start.toISOString(),
            end_date: end.toISOString()
        };

        // Optimistic UI Update
        setEvents(prev => prev.map(e => e.id === id ? updated : e));

        await adapter.updateEvent(updated);
    };

    const handleEventResize = async (id: string, start: Date, end: Date) => {
        // Same logic as drop for now
        await handleEventDrop(id, start, end);
    };

    const handleDateClick = (date: Date) => {
        setSelectedJob({
            title: '',
            type: 'PRODUCTION',
            status: 'SCHEDULED',
            start: date.toISOString(),
            end: new Date(date.getTime() + 60 * 60 * 1000).toISOString(), // +1 hour default
            staffIds: [],
            notes: ''
        });
        setIsModalOpen(true);
    };

    const handleEventClick = (id: string) => {
        const event = events.find(e => e.id === id);
        if (!event) return;

        setSelectedJob({
            id: event.id,
            title: event.title,
            type: event.type,
            status: event.status,
            start: event.start_date,
            end: event.end_date || event.start_date,
            staffIds: event.staff_ids,
            notes: event.notes || ''
        });
        setIsModalOpen(true);
    };

    const handleSaveJob = async (data: JobFormData) => {
        const newEvent: ScheduleEvent = {
            id: data.id || uuidv4(),
            title: data.title,
            type: data.type,
            status: data.status,
            start_date: data.start,
            end_date: data.end,
            staff_ids: data.staffIds,
            notes: data.notes,
            created_at: new Date().toISOString()
        };

        // Optimistic Update
        if (data.id) {
            setEvents(prev => prev.map(e => e.id === data.id ? newEvent : e));
        } else {
            setEvents(prev => [...prev, newEvent]);
        }

        await adapter.updateEvent(newEvent);
        setIsModalOpen(false);
    };

    const handleDeleteJob = async () => {
        if (!selectedJob?.id) return;

        // Remove from list
        setEvents(prev => prev.filter(e => e.id !== selectedJob.id));

        // TODO: Add delete method to adapter if needed, or just status=CANCELLED
        // For now, removing from UI is enough for the demo
        setIsModalOpen(false);
    };

    const handleExternalDrop = async (info: any) => {
        // Logic to create event from sidebar drop
        const title = info.draggedEl.getAttribute('data-title');
        const date = info.date;

        const newEvent: ScheduleEvent = {
            id: uuidv4(),
            title: title || 'New Job',
            type: 'PRODUCTION', // Default, logic could be smarter
            status: 'SCHEDULED',
            start_date: date.toISOString(),
            end_date: new Date(date.getTime() + 2 * 60 * 60 * 1000).toISOString(), // 2h default
            staff_ids: [],
            created_at: new Date().toISOString()
        };

        setEvents(prev => [...prev, newEvent]);
        await adapter.updateEvent(newEvent);
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <DraggableSidebar />

            <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between shadow-[0_1px_2px_rgba(0,0,0,0.03)] z-20">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                            Production Schedule
                        </h1>
                        <p className="text-sm text-slate-500 font-medium mt-0.5">Manage assignments & timeline</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center text-sm font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-md border border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                            Live Updates
                        </div>

                        <div className="h-8 w-px bg-slate-200 mx-2"></div>

                        <button
                            onClick={() => {
                                const now = new Date();
                                handleDateClick(now);
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0"
                        >
                            <Plus className="w-4 h-4" />
                            New Job
                        </button>
                    </div>
                </header>

                <div className="flex-1 p-6 overflow-hidden">
                    <CalendarEngine
                        ref={calendarRef}
                        events={events}
                        staff={staff}
                        onEventDrop={(id, start, end) => handleEventDrop(id, start, end)}
                        onEventResize={(id, start, end) => handleEventResize(id, start, end)}
                        onDateClick={handleDateClick}
                        onEventClick={handleEventClick}
                        onExternalDrop={handleExternalDrop}
                    />
                </div>
            </main>

            <JobModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveJob}
                onDelete={selectedJob?.id ? handleDeleteJob : undefined}
                initialData={selectedJob}
                staff={staff}
            />
        </div>
    );
}
