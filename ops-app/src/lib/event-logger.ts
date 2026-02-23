import { SystemEvent, EntityType, EventType } from './types';

// Mock in-memory storage for events
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

        MOCK_EVENTS.unshift(event); // Newest first
        console.log(`[EventLogger] ${eventType} on ${entityType} ${entityId} by ${actorId}`, details.metadata);
    }

    static async getHistory(entityId: string): Promise<SystemEvent[]> {
        return MOCK_EVENTS.filter(e => e.entity_id === entityId);
    }

    static async getRecentEvents(limit: number = 50): Promise<SystemEvent[]> {
        return MOCK_EVENTS.slice(0, limit);
    }
}
