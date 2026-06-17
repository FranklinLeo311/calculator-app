/**
 * Firebase project config for my-maths-3bef4.
 * WEB_API_KEY: Firebase Console → Project Settings → General → Web API Key
 * Admin enters this once via Settings → Admin Panel → Firebase Setup.
 */

export const FIREBASE_PROJECT_ID = 'my-maths-3bef4';
export const FIREBASE_DB_URL     = 'https://my-maths-3bef4-default-rtdb.firebaseio.com';

// Admin identifiers — hardcoded, never editable by users
export const ADMIN_EMAIL = 'franklinleo311@gmail.com';
export const ADMIN_PHONE = '6383463958';

// Loaded at runtime from SecureStore (admin sets this once)
export const FIREBASE_API_KEY_STORAGE = 'firebase_api_key_v1';
export const FIREBASE_GOOGLE_CLIENT_ID_STORAGE = 'firebase_google_client_id_v1';
