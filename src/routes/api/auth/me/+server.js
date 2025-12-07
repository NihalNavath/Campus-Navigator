import { json } from '@sveltejs/kit';
import { isAuthenticated, getSession, getSessionFromCookies } from '$lib/server/auth.js';

/** @type {import('./$types').RequestHandler} */
export async function GET({ cookies }) {
    if (!isAuthenticated(cookies)) {
        return json({ authenticated: false }, { status: 401 });
    }

    const token = getSessionFromCookies(cookies);
    const session = getSession(token);

    return json({
        authenticated: true,
        user: {
            username: session.username
        }
    });
}
