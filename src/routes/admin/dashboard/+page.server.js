import { redirect } from '@sveltejs/kit';
import { isAuthenticated } from '$lib/server/auth.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
    // Redirect to login if not authenticated
    if (!isAuthenticated(cookies)) {
        throw redirect(303, '/admin');
    }

    return {};
}
