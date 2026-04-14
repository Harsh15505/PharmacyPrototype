import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Medicine } from "@/types";

const COL = "medicines";

export function subscribeMedicines(callback: (medicines: Medicine[]) => void) {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine));
    callback(data);
  });
}

export async function getMedicines(): Promise<Medicine[]> {
  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Medicine));
}

export async function addMedicine(
  medicine: Omit<Medicine, "id" | "createdAt">
): Promise<void> {
  await addDoc(collection(db, COL), {
    ...medicine,
    createdAt: new Date().toISOString(),
  });
}

export async function updateMedicine(
  id: string,
  medicine: Partial<Omit<Medicine, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, COL, id), medicine);
}

export async function deleteMedicine(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
