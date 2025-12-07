import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVENTS_FILE = path.join(__dirname, 'data', 'events.json');

/**
 * Read events from JSON file
 */
export function getEvents() {
	try {
		const data = fs.readFileSync(EVENTS_FILE, 'utf-8');
		return JSON.parse(data);
	} catch (error) {
		console.error('Error reading events:', error);
		return [];
	}
}

/**
 * Write events to JSON file
 */
function saveEvents(events) {
	try {
		const dir = path.dirname(EVENTS_FILE);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2), 'utf-8');
		return true;
	} catch (error) {
		console.error('Error saving events:', error);
		return false;
	}
}

/**
 * Get event by ID
 */
export function getEventById(id) {
	const events = getEvents();
	return events.find((e) => e.id === id);
}

/**
 * Create new event
 */
export function createEvent(eventData) {
	const events = getEvents();
	const newEvent = {
		id: `evt_${Date.now()}`,
		...eventData,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString()
	};
	events.push(newEvent);
	saveEvents(events);
	return newEvent;
}

/**
 * Update existing event
 */
export function updateEvent(id, eventData) {
	const events = getEvents();
	const index = events.findIndex((e) => e.id === id);
	
	if (index === -1) {
		return null;
	}
	
	events[index] = {
		...events[index],
		...eventData,
		id, // Preserve ID
		updatedAt: new Date().toISOString()
	};
	
	saveEvents(events);
	return events[index];
}

/**
 * Delete event
 */
export function deleteEvent(id) {
	const events = getEvents();
	const filteredEvents = events.filter((e) => e.id !== id);
	
	if (filteredEvents.length === events.length) {
		return false; // Event not found
	}
	
	saveEvents(filteredEvents);
	return true;
}

/**
 * Validate event data
 */
export function validateEvent(data) {
	const errors = [];
	
	if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
		errors.push('Title is required');
	}
	
	if (data.location && typeof data.location === 'object') {
		if (!data.location.name || typeof data.location.name !== 'string') {
			errors.push('Location name is required');
		}
		if (!Array.isArray(data.location.coordinates) || data.location.coordinates.length !== 2) {
			errors.push('Location coordinates must be an array of [longitude, latitude]');
		}
	}
	
	return errors;
}
