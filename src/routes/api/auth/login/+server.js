import { json } from '@sveltejs/kit';
import { verifyCredentials, createSession } from '$lib/server/auth.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, cookies }) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return json({ error: 'Username and password required' }, { status: 400 });
        }

        // Verify credentials
        if (!verifyCredentials(username, password)) {
            return json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Create session
        const token = createSession();

        // Set HTTP-only cookie
        cookies.set('session', token, {
            path: '/',
            httpOnly: true,
            sameSite: 'strict',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 // 24 hours
        });

        return json({
            success: true,
            user: { username }
        });
    } catch (error) {
        console.error('Login error:', error);
        return json({ error: 'Login failed' }, { status: 500 });
    }
}
