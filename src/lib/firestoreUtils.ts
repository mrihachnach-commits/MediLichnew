import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function sanitizeFirestoreData(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFirestoreData).filter(v => v !== undefined);
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = sanitizeFirestoreData(value);
    }
  }
  return result;
}

export const subscribeToEvents = (userId: string, callback: (events: any[]) => void) => {
  const path = `users/${userId}/events`;
  const q = query(collection(db, path));
  return onSnapshot(q, (snapshot) => {
    const eventsMap = new Map<string, any>();
    snapshot.docs.forEach(doc => {
      eventsMap.set(doc.id, { ...doc.data(), id: doc.id });
    });
    callback(Array.from(eventsMap.values()));
  }, (error) => {
    console.warn('Firestore subscription status:', error?.message || error);
  });
};

export const subscribeToSettings = (userId: string, callback: (settings: any) => void) => {
  const path = `users/${userId}`;
  return onSnapshot(doc(db, path), (snap) => {
    if (snap.exists() && snap.data()?.settings) {
      callback(snap.data()?.settings);
    }
  }, (error) => {
    console.warn('Firestore subscription status:', error?.message || error);
  });
};

export const getEvents = async (userId: string) => {
  const path = `users/${userId}/events`;
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    const eventsMap = new Map<string, any>();
    snapshot.docs.forEach(doc => {
      eventsMap.set(doc.id, { ...doc.data(), id: doc.id });
    });
    return Array.from(eventsMap.values());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
};

export const createEvent = async (userId: string, eventData: any) => {
  const path = `users/${userId}/events`;
  try {
    const docRef = eventData.id 
      ? doc(db, path, eventData.id) 
      : doc(collection(db, path));

    const rawData = {
      title: 'Công việc mới',
      startTime: '08:00',
      endTime: '09:00',
      dayOfWeek: 1,
      category: 'hospital',
      priority: 'P2',
      completed: false,
      isIntervention: false,
      ...eventData,
      id: docRef.id,
      userId,
      createdAt: new Date().toISOString()
    };
    const data = sanitizeFirestoreData(rawData);
    await setDoc(docRef, data, { merge: true });
    return data;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getUserDoc = async (userId: string) => {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, path));
    return snap.exists() ? snap.data() : null;
  } catch (error) {
    return null;
  }
};

export const markUserSeeded = async (userId: string) => {
  const path = `users/${userId}`;
  try {
    await setDoc(doc(db, path), { hasBeenSeeded: true }, { merge: true });
  } catch (error) {
    console.error("Error marking user seeded:", error);
  }
};

export const updateEvent = async (userId: string, eventId: string, updates: any) => {
  const path = `users/${userId}/events/${eventId}`;
  try {
    const docRef = doc(db, path);
    const sanitizedUpdates = sanitizeFirestoreData({ ...updates, updatedAt: new Date().toISOString() });
    await setDoc(docRef, sanitizedUpdates, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteEvent = async (userId: string, eventId: string) => {
  const path = `users/${userId}/events/${eventId}`;
  try {
    const docRef = doc(db, path);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const getUserSettings = async (userId: string) => {
  const path = `users/${userId}`;
  try {
    const snap = await getDoc(doc(db, path));
    return snap.data()?.settings || null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
};

export const saveUserSettings = async (userId: string, settings: any) => {
  const path = `users/${userId}`;
  try {
    const data = sanitizeFirestoreData({ 
      uid: userId, 
      email: auth.currentUser?.email || '', 
      settings, 
      updatedAt: new Date().toISOString() 
    });
    await setDoc(
      doc(db, path), 
      data, 
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};
