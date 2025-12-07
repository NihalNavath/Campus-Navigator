import { json } from '@sveltejs/kit';
import { deleteSession, getSessionFromCookies } from '$lib/server/auth.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ cookies }) {
    const token = getSessionFromCookies(cookies);

    if (token) {
        deleteSession(token);
    }

    // Clear cookie
    cookies.delete('session', { path: '/' });

    return json({ success: true });
}
