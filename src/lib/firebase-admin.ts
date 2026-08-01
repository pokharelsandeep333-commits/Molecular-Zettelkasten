import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Lazy initialize Firebase Admin SDK
function getAdminAuth() {
  if (!getApps().length) {
    try {
      initializeApp({
        credential: cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dummy-project-id',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'dummy@example.com',
          // Handle newlines in the private key correctly
          privateKey: (process.env.FIREBASE_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\n-----END PRIVATE KEY-----\n').replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Firebase admin initialization error', error);
    }
  }
  return getAuth();
}

/**
 * Helper function to verify the Authorization Bearer token from a Request.
 * Returns the decoded token if valid, otherwise throws an error.
 */
export async function verifyAuth(req: Request) {
  const authHeader = req.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid Authorization header');
  }

  const token = authHeader.split('Bearer ')[1];
  
  try {
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    // Critical Backend Security Gap Fixed: Only allow the owner's email
    if (decodedToken.email !== 'pokharelsandeep333@gmail.com') {
      console.warn(`Unauthorized login attempt by: ${decodedToken.email}`);
      throw new Error('Email not whitelisted');
    }

    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase JWT:', error);
    throw new Error('Unauthorized');
  }
}
