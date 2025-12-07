import crypto from 'crypto';

// Simple admin credentials (in production, use environment variables and hashed passwords)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'christ@admin123'; // Change this in production!

// Session storage (in production, use a proper session store like Redis)
const sessions = new Map();

/**
 * Generate a secure session token
 */
function generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Verify admin credentials
 */
export function verifyCredentials(username, password) {
    return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

/**
 * Create a new session for admin
 */
export function createSession() {
    const token = generateSessionToken();
    const session = {
        username: ADMIN_USERNAME,
        createdAt: Date.now(),
        expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };
    sessions.set(token, session);
    return token;
}

/**
 * Validate session token
 */
export function validateSession(token) {
    if (!token) return false;

    const session = sessions.get(token);
    if (!session) return false;

    // Check if session has expired
    if (Date.now() > session.expiresAt) {
        sessions.delete(token);
        return false;
    }

    return true;
}

/**
 * Get session data
 */
export function getSession(token) {
    if (!validateSession(token)) return null;
    return sessions.get(token);
}

/**
 * Delete session
 */
export function deleteSession(token) {
    return sessions.delete(token);
}

/**
 * Extract session token from cookies
 */
export function getSessionFromCookies(cookies) {
    return cookies.get('session');
}

/**
 * Check if user is authenticated from request
 */
export function isAuthenticated(cookies) {
    const token = getSessionFromCookies(cookies);
    return validateSession(token);
}
