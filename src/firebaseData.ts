import { collection, deleteDoc, doc, getDoc, getDocs, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';
import { db, requireFirebase } from './firebase';
import type { Profile } from './profile';
import type { RequestItem } from './types';

const database = () => requireFirebase(db);
const userRef = (uid:string) => doc(database(), 'users', uid);
const requestsRef = (uid:string) => collection(database(), 'users', uid, 'requests');

export async function readProfile(uid:string):Promise<Profile|null> {
  const snapshot = await getDoc(userRef(uid));
  return snapshot.exists() ? snapshot.data() as Profile : null;
}

export async function writeProfile(uid:string, profile:Profile) {
  await setDoc(userRef(uid), profile, { merge:true });
}

export async function createRequest(uid:string, item:RequestItem) {
  await setDoc(doc(requestsRef(uid), item.id), item);
}

export async function seedRequestsIfEmpty(uid:string, items:RequestItem[]) {
  const snapshot = await getDocs(requestsRef(uid));
  if (!snapshot.empty) return;
  await Promise.all(items.map(item => createRequest(uid, item)));
}

export function watchRequests(uid:string, next:(items:RequestItem[])=>void, fail:(error:Error)=>void):Unsubscribe {
  return onSnapshot(requestsRef(uid), snapshot => {
    const items = snapshot.docs.map(entry => ({...entry.data(), id:entry.id} as RequestItem));
    next(items.sort((a,b)=>b.createdAt-a.createdAt));
  }, fail);
}

export async function updateRequest(uid:string, id:string, patch:Partial<RequestItem>) {
  await setDoc(doc(requestsRef(uid), id), patch, { merge:true });
}

export async function deleteRequest(uid:string, id:string) {
  await deleteDoc(doc(requestsRef(uid), id));
}
