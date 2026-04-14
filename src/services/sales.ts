import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  doc,
  increment,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Sale, SaleItem } from "@/types";

const COL = "sales";
const MED_COL = "medicines";

export function subscribeTodaySales(callback: (sales: Sale[]) => void) {
  // Use noon as the daily reset boundary — filter client-side (no composite index needed)
  const now = new Date();
  const boundary = new Date(now);
  boundary.setHours(12, 0, 0, 0);
  if (now < boundary) boundary.setDate(boundary.getDate() - 1);
  const boundaryISO = boundary.toISOString();

  const q = query(collection(db, COL), orderBy("createdAt", "desc"));

  return onSnapshot(q, (snap) => {
    const data = snap.docs
      .map((d) => ({ id: d.id, ...d.data() } as Sale))
      .filter((s) => s.createdAt >= boundaryISO);
    callback(data);
  });
}

export async function createSale(
  items: SaleItem[],
  totalAmount: number
): Promise<{ id: string; billNumber: number }> {
  // Use a transaction to write the sale AND decrement stock atomically
  return await runTransaction(db, async (transaction) => {
    // 1. Verify each medicine still has enough stock
    const medRefs = items.map((item) => doc(db, MED_COL, item.medicineId));
    const medSnaps = await Promise.all(medRefs.map((ref) => transaction.get(ref)));

    for (let i = 0; i < items.length; i++) {
      const snap = medSnaps[i];
      if (!snap.exists()) {
        throw new Error(`Medicine "${items[i].name}" no longer exists.`);
      }
      const currentQty = snap.data().quantity as number;
      if (currentQty < items[i].quantity) {
        throw new Error(
          `Insufficient stock for "${items[i].name}". Available: ${currentQty}, Requested: ${items[i].quantity}`
        );
      }
    }

    // 2. Fetch and increment the billing counter
    const counterRef = doc(db, "controls", "sales_counter");
    const counterSnap = await transaction.get(counterRef);
    let nextBillNumber = 1;
    if (counterSnap.exists()) {
      nextBillNumber = (counterSnap.data().lastBillNumber || 0) + 1;
      transaction.update(counterRef, { lastBillNumber: nextBillNumber });
    } else {
      transaction.set(counterRef, { lastBillNumber: 1 });
    }

    // 3. Write the sale document with sequential bill number
    const saleRef = doc(collection(db, COL));
    transaction.set(saleRef, {
      billNumber: nextBillNumber,
      items,
      totalAmount,
      createdAt: new Date().toISOString(),
    });

    // 4. Decrement each medicine's quantity
    for (let i = 0; i < items.length; i++) {
      transaction.update(medRefs[i], {
        quantity: increment(-items[i].quantity),
      });
    }

    return { id: saleRef.id, billNumber: nextBillNumber };
  });
}

