import { SystemEvent, EntityType, EventType } from './types';
import { supabaseAdmin } from './supabase';

// Fallback in-memory storage when Supabase Admin is not configured (e.g. local mock)
const MOCK_EVENTS: SystemEvent[] = [];

export class EventLogger {
    static async log(
        entityId: string,
        entityType: EntityType,
        eventType: EventType,
        actorId: string,
        details: {
            prevState?: any;
            newState?: any;
            metadata?: Record<string, any>;
        }
    ): Promise<void> {
        const event: SystemEvent = {
            id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            entity_id: entityId,
            entity_type: entityType,
            event_type: eventType,
            actor_id: actorId,
            timestamp: new Date().toISOString(),
            prev_state: details.prevState,
            new_state: details.newState,
            metadata: details.metadata
        };

        // Persist to Supabase if admin client available; otherwise keep in memory
        if (supabaseAdmin) {
            const { error } = await supabaseAdmin.from('system_events').insert({
                entity_id: event.entity_id,
                entity_type: event.entity_type,
                event_type: event.event_type,
                prev_state: event.prev_state,
                new_state: event.new_state,
                actor_id: event.actor_id,
                timestamp: event.timestamp,
                metadata: event.metadata,
            });
            if (error) {
                console.error('[EventLogger] Failed to persist system event:', error);
            }
        } else {
            MOCK_EVENTS.unshift(event);
        }

        console.log(`[EventLogger] ${eventType} on ${entityType} ${entityId} by ${actorId}`, details.metadata);
    }

    static async getHistory(entityId: string): Promise<SystemEvent[]> {
        if (supabaseAdmin) {
            const { data, error } = await supabaseAdmin
                .from('system_events')
                .select('*')
                .eq('entity_id', entityId)
                .order('timestamp', { ascending: false });
            if (error || !data) return [];
            return data.map((row: any) => ({
                id: row.id,
                entity_id: row.entity_id,
                entity_type: row.entity_type,
                event_type: row.event_type,
                prev_state: row.prev_state,
                new_state: row.new_state,
                actor_id: row.actor_id,
                timestamp: row.timestamp,
                metadata: row.metadata || {},
            })) as SystemEvent[];
        }
        return MOCK_EVENTS.filter(e => e.entity_id === entityId);
    }

    static async getRecentEvents(limit: number = 50): Promise<SystemEvent[]> {
        if (supabaseAdmin) {
            const { data, error } = await supabaseAdmin
                .from('system_events')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(limit);
            if (error || !data) return [];
            return data.map((row: any) => ({
                id: row.id,
                entity_id: row.entity_id,
                entity_type: row.entity_type,
                event_type: row.event_type,
                prev_state: row.prev_state,
                new_state: row.new_state,
                actor_id: row.actor_id,
                timestamp: row.timestamp,
                metadata: row.metadata || {},
            })) as SystemEvent[];
        }
        return MOCK_EVENTS.slice(0, limit);
    }
}
