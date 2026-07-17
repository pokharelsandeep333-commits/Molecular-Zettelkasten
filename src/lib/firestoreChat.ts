import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { ChatSession } from '@/components/ChatSidebar';

const getChatDocRef = (userId: string) => {
  if (!db) throw new Error("Firestore not initialized");
  return doc(db, 'users', userId);
};

export const saveChatSessionsToCloud = async (userId: string, sessions: ChatSession[]) => {
  try {
    const docRef = getChatDocRef(userId);
    await setDoc(docRef, { chatSessions: sessions }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving chat sessions to cloud:", error);
    return false;
  }
};

export const loadChatSessionsFromCloud = async (userId: string): Promise<ChatSession[] | null> => {
  try {
    const docRef = getChatDocRef(userId);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.chatSessions && Array.isArray(data.chatSessions)) {
        return data.chatSessions as ChatSession[];
      }
    }
    return null;
  } catch (error) {
    console.error("Error loading chat sessions from cloud:", error);
    return null;
  }
};

export const subscribeToChatSessions = (
  userId: string,
  onUpdate: (sessions: ChatSession[]) => void,
  onError?: (error: Error) => void
) => {
  try {
    const docRef = getChatDocRef(userId);
    return onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.chatSessions && Array.isArray(data.chatSessions)) {
          onUpdate(data.chatSessions as ChatSession[]);
        } else {
          onUpdate([]);
        }
      } else {
        onUpdate([]);
      }
    }, (error) => {
      console.error("Error in chat session subscription:", error);
      if (onError) onError(error);
    });
  } catch (error) {
    console.error("Error setting up chat subscription:", error);
    if (onError) onError(error as Error);
    return () => {}; // return empty unsubscribe function
  }
};
