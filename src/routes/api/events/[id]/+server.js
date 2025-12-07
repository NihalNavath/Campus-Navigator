import { json } from '@sveltejs/kit';
import { getEventById, updateEvent, deleteEvent, validateEvent } from '$lib/server/db.js';
import { isAuthenticated } from '$lib/server/auth.js';

/** @type {import('./$types').RequestHandler} */
export async function PUT({ params, request, cookies }) {
    // Check authentication
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const eventData = await request.json();
        const { id } = params;

        // Validate event data
        const errors = validateEvent(eventData);
        if (errors.length > 0) {
            return json({ error: 'Validation failed', errors }, { status: 400 });
        }

        const updatedEvent = updateEvent(id, eventData);

        if (!updatedEvent) {
            return json({ error: 'Event not found' }, { status: 404 });
        }

        return json(updatedEvent);
    } catch (error) {
        console.error('Error updating event:', error);
        return json({ error: 'Failed to update event' }, { status: 500 });
    }
}

/** @type {import('./$types').RequestHandler} */
export async function DELETE({ params, cookies }) {
    // Check authentication
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = params;
        const success = deleteEvent(id);

        if (!success) {
            return json({ error: 'Event not found' }, { status: 404 });
        }

        return json({ success: true });
    } catch (error) {
        console.error('Error deleting event:', error);
        return json({ error: 'Failed to delete event' }, { status: 500 });
    }
}
