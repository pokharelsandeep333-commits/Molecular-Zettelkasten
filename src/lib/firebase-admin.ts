import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Handle newlines in the private key correctly
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminAuth = getAuth();

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
