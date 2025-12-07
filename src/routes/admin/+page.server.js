import { redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
    // No authentication check needed - user might not be logged in yet
    return {};
}
