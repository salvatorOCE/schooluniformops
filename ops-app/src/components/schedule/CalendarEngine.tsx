'use client';

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { ScheduleEvent, StaffMember } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Clock, User } from 'lucide-react';
import '@/app/globals.css';

interface CalendarEngineProps {
    events: ScheduleEvent[];
    staff: StaffMember[];
    onEventDrop: (eventId: string, start: Date, end: Date) => void;
    onEventResize: (eventId: string, start: Date, end: Date) => void;
    onDateClick: (date: Date) => void;
    onEventClick: (eventId: string) => void;
    onExternalDrop: (info: any) => void;
}

export interface CalendarRef {
    getApi: () => any;
}

export const CalendarEngine = forwardRef<CalendarRef, CalendarEngineProps>(({
    events,
    staff,
    onEventDrop,
    onEventResize,
    onDateClick,
    onEventClick,
    onExternalDrop
}, ref) => {
    const calendarRef = useRef<FullCalendar>(null);

    useImperativeHandle(ref, () => ({
        getApi: () => calendarRef.current?.getApi()
    }));

    // Map internal events to FullCalendar events
    const calendarEvents = events.map(evt => {
        // Find staff color if assigned
        const assignedStaff = staff.filter(s => evt.staff_ids.includes(s.id));
        const start = evt.start_date;
        // FullCalendar needs an end for resizable time events; default to +1h if missing
        const end = evt.end_date || new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();

        // Base Colors
        let colorKey = 'slate';
        let borderColor = '#94a3b8';
        let bgTint = '#f1f5f9';

        switch (evt.type) {
            case 'PRODUCTION':
                colorKey = 'indigo';
                borderColor = '#6366f1';
                bgTint = '#e0e7ff'; // indigo-100
                break;
            case 'EMBROIDERY':
                colorKey = 'amber';
                borderColor = '#f59e0b';
                bgTint = '#fef3c7'; // amber-100
                break;
            case 'DISPATCH':
                colorKey = 'emerald';
                borderColor = '#10b981';
                bgTint = '#d1fae5'; // emerald-100
                break;
            case 'FIX_UP':
                colorKey = 'rose';
                borderColor = '#f43f5e';
                bgTint = '#ffe4e6'; // rose-100
                break;
            case 'SENIOR_PRIORITY':
                colorKey = 'violet';
                borderColor = '#8b5cf6';
                bgTint = '#ede9fe'; // violet-100
                break;
        }

        return {
            id: evt.id,
            title: evt.title,
            start,
            end,
            backgroundColor: 'transparent', // We handle BG in render for transparency
            borderColor: 'transparent',
            extendedProps: {
                type: evt.type,
                status: evt.status,
                staff: assignedStaff,
                notes: evt.notes,
                colorKey,
                borderColor,
                bgTint
            }
        };
    });

    const renderEventContent = (eventInfo: any) => {
        const { extendedProps } = eventInfo.event;
        const assignedStaff = extendedProps.staff || [];
        const { borderColor, bgTint } = extendedProps;

        return (
            <div
                className={cn(
                    "flex flex-col h-full w-full overflow-hidden text-xs leading-tight p-2.5 relative group transition-all duration-200",
                    "border-l-[3px] rounded-r-md shadow-sm hover:shadow-md hover:scale-[1.01]"
                )}
                style={{
                    backgroundColor: bgTint,
                    borderLeftColor: borderColor,
                    color: '#334155' // Slate-700 text
                }}
            >
                <div className="flex justify-between items-start z-10">
                    <span className="font-semibold text-slate-900 truncate text-[11px] tracking-tight">
                        {eventInfo.event.title}
                    </span>
                </div>

                {/* Time range */}
                <div className="flex items-center gap-1.5 text-slate-500 mt-1 text-[10px] font-medium tracking-wide">
                    {eventInfo.timeText}
                </div>

                {/* Notes */}
                {extendedProps.notes && (
                    <div className="mt-1.5 text-[10px] text-slate-500 line-clamp-2 break-words">
                        {extendedProps.notes}
                    </div>
                )}

                {/* Footer: Staff & Status */}
                <div className="mt-auto pt-2 flex items-center justify-between">
                    {/* Avatars */}
                    {assignedStaff.length > 0 ? (
                        <div className="flex -space-x-2">
                            {assignedStaff.map((s: StaffMember) => (
                                <div
                                    key={s.id}
                                    className={cn(
                                        "w-5 h-5 rounded-full border-[1.5px] border-white flex items-center justify-center text-[9px] text-white shadow-sm ring-1 ring-black/5 z-0 transition-transform group-hover:translate-x-0.5",
                                        s.avatar_color || 'bg-slate-500'
                                    )}
                                    title={s.name}
                                >
                                    {s.initials}
                                </div>
                            ))}
                        </div>
                    ) : <div />}

                    {extendedProps.status === 'COMPLETED' && (
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="h-full w-full bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200 overflow-hidden font-sans">
            <style jsx global>{`
                /* Toolbar Customization */
                .fc-header-toolbar {
                    padding: 16px 24px;
                    margin-bottom: 0 !important;
                    background: white;
                    border-bottom: 1px solid #f1f5f9;
                }
                .fc-toolbar-title {
                    font-size: 1.125rem !important;
                    font-weight: 700 !important;
                    color: #0f172a;
                    letter-spacing: -0.025em;
                }
                .fc-button {
                    background-color: white !important;
                    border: 1px solid #e2e8f0 !important;
                    color: #475569 !important;
                    font-weight: 600 !important;
                    font-size: 0.875rem !important;
                    padding: 8px 16px !important;
                    border-radius: 8px !important;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
                    text-transform: capitalize !important;
                    transition: all 0.2s !important;
                }
                .fc-button:hover {
                    background-color: #f8fafc !important;
                    border-color: #cbd5e1 !important;
                    color: #1e293b !important;
                    transform: translateY(-1px);
                }
                .fc-button-active {
                    background-color: #f1f5f9 !important;
                    border-color: #94a3b8 !important;
                    color: #0f172a !important;
                    box-shadow: inset 0 1px 2px rgba(0,0,0,0.05) !important;
                }
                .fc-button-primary:not(:disabled):active, .fc-button-primary:not(:disabled).fc-button-active {
                    background-color: #f1f5f9 !important;
                    border-color: #94a3b8 !important;
                    color: #0f172a !important;
                }
                .fc-button:focus { box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2) !important; }

                /* Header Styling */
                .fc-theme-standard th { 
                    border: none; 
                    border-bottom: 1px solid #f1f5f9;
                    padding: 12px 0;
                }
                .fc-col-header-cell-cushion {
                    color: #64748b;
                    font-weight: 600;
                    font-size: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                }
                
                /* Grid Styling - hour blocks (sized between compact and large) */
                .fc-theme-standard td { border: 1px solid #f8fafc; }
                .fc-timegrid-slot { height: 6rem !important; min-height: 6rem !important; }
                .fc-timegrid-slot-label-cushion { 
                    font-size: 11px; 
                    color: #94a3b8; 
                    font-weight: 500;
                    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; 
                }
                .fc-timegrid-now-indicator-line { border-color: #ef4444; border-width: 2px; }
                .fc-timegrid-now-indicator-arrow { border-color: #ef4444; border-width: 6px 0 6px 7px; }
                
                /* Event Container - fill full width of day column */
                .fc-timegrid-event-harness {
                    left: 0 !important;
                    right: 0 !important;
                    margin: 0 2px !important;
                }
                .fc-timegrid-event-harness > .fc-timegrid-event {
                    left: 0 !important;
                    right: 0 !important;
                    width: 100% !important;
                }
                .fc-event { 
                    border: none !important;
                    background: transparent !important;
                    box-shadow: none !important;
                    margin: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                }
                /* Resize handles: visible grip so users can elongate/shorten events */
                .fc-event .fc-event-resizer {
                    display: block !important;
                    height: 10px !important;
                    min-height: 10px !important;
                    cursor: ns-resize !important;
                    background: rgba(0,0,0,0.06) !important;
                }
                .fc-event .fc-event-resizer:hover {
                    background: rgba(99, 102, 241, 0.2) !important;
                }
                .fc-event .fc-event-resizer-start {
                    top: 0 !important;
                }
                
                /* Today Highlight */
                .fc-day-today { background-color: #f8fafc !important; }

                /* Hide Scrollbars */
                .fc-scroller::-webkit-scrollbar { width: 6px; }
                .fc-scroller::-webkit-scrollbar-track { background: transparent; }
                .fc-scroller::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
                .fc-scroller::-webkit-scrollbar-thumb:hover { background-color: #cbd5e1; }
            `}</style>
            <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                initialView="timeGridWeek"
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                }}
                editable={true}
                eventResizableFromStart={true}
                droppable={true}
                selectable={true}
                slotMinTime="07:00:00"
                slotMaxTime="18:00:00"
                allDaySlot={false}
                slotDuration="01:00:00"
                snapDuration="00:15:00"
                height="100%"
                contentHeight={1100}
                expandRows={true}
                events={calendarEvents}
                eventContent={renderEventContent}
                eventDrop={(info) => {
                    const { event } = info;
                    onEventDrop(event.id, event.start!, event.end!);
                }}
                eventResize={(info) => {
                    const { event } = info;
                    onEventResize(event.id, event.start!, event.end!);
                }}
                dateClick={(info) => {
                    onDateClick(info.date);
                }}
                eventClick={(info) => {
                    onEventClick(info.event.id);
                }}
                drop={(info) => {
                    onExternalDrop(info);
                }}
            />
        </div>
    );
});

CalendarEngine.displayName = 'CalendarEngine';
