import {
  collection,
  doc,
  addDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './config';

// --- Imoveis ---

function imoveisCol(uid: string) {
  return collection(db, 'users', uid, 'imoveis');
}

export async function createImovel(uid: string, data: Record<string, unknown>) {
  const ref = await addDoc(imoveisCol(uid), {
    ...data,
    deleted: false,
    deletedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listImoveis(uid: string): Promise<(DocumentData & { id: string })[]> {
  const q = query(imoveisCol(uid), where('deleted', '==', false), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getImovel(uid: string, imovelId: string) {
  const snap = await getDoc(doc(db, 'users', uid, 'imoveis', imovelId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function updateImovel(uid: string, imovelId: string, data: Record<string, unknown>) {
  await updateDoc(doc(db, 'users', uid, 'imoveis', imovelId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function softDeleteImovel(uid: string, imovelId: string) {
  await updateDoc(doc(db, 'users', uid, 'imoveis', imovelId), {
    deleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// --- Alerts ---

function alertsCol(uid: string) {
  return collection(db, 'users', uid, 'alerts');
}

export async function createAlert(uid: string, data: Record<string, unknown>) {
  const ref = await addDoc(alertsCol(uid), {
    ...data,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listAlerts(uid: string) {
  const q = query(alertsCol(uid), where('active', '==', true));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function deactivateAlert(uid: string, alertId: string) {
  await updateDoc(doc(db, 'users', uid, 'alerts', alertId), {
    active: false,
    updatedAt: serverTimestamp(),
  });
}
