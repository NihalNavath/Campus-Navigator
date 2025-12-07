import { json } from '@sveltejs/kit';
import { getEvents, createEvent, validateEvent } from '$lib/server/db.js';
import { isAuthenticated } from '$lib/server/auth.js';

/** @type {import('./$types').RequestHandler} */
export async function GET() {
    const events = getEvents();
    return json(events);
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, cookies }) {
    // Check authentication for creating events
    if (!isAuthenticated(cookies)) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const eventData = await request.json();

        // Validate event data
        const errors = validateEvent(eventData);
        if (errors.length > 0) {
            return json({ error: 'Validation failed', errors }, { status: 400 });
        }

        const newEvent = createEvent(eventData);
        return json(newEvent, { status: 201 });
    } catch (error) {
        console.error('Error creating event:', error);
        return json({ error: 'Failed to create event' }, { status: 500 });
    }
}
