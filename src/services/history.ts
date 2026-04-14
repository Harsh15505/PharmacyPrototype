import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sale } from "@/types";

const COL = "sales";

/** Subscribe to last N sales, ordered by newest first */
export function subscribeSalesHistory(
  count: number,
  callback: (sales: Sale[]) => void
) {
  const q = query(
    collection(db, COL),
    orderBy("createdAt", "desc"),
    limit(count)
  );
  return onSnapshot(q, (snap) => {
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale));
    callback(data);
  });
}
