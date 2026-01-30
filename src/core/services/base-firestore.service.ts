import { Firestore, collection, CollectionReference, doc, setDoc, getDoc, deleteDoc, updateDoc, DocumentReference, getDocs, query, where, limit } from '@angular/fire/firestore';
import { QueryDocumentSnapshot, SnapshotOptions, FirestoreDataConverter } from 'firebase/firestore';
import { inject } from '@angular/core';

export abstract class BaseFirestoreService<T extends { id: string }> {
  protected readonly firestore = inject(Firestore);
  protected abstract collectionPath: string;

  protected colRef(): CollectionReference<T> {
    const conv: FirestoreDataConverter<T> = {
      toFirestore: (data: T) => {
        const { id, ...rest } = (data as unknown as Record<string, unknown>);
        return rest as any;
      },
      fromFirestore: (snap: QueryDocumentSnapshot, options: SnapshotOptions) => {
        const d = snap.data(options) as Omit<T, 'id'>;
        return { ...d, id: snap.id } as T;
      },
    };
    return (collection(this.firestore, this.collectionPath) as any).withConverter(conv) as CollectionReference<T>;
  }

  docRef(id: string): DocumentReference<T> {
    return doc(this.colRef(), id) as DocumentReference<T>;
  }

  async set(item: T): Promise<void> {
    await setDoc(this.docRef(item.id), item);
  }

  async update(id: string, partial: Partial<T>): Promise<void> {
    await updateDoc(this.docRef(id) as any, partial as any);
  }

  async delete(id: string): Promise<void> {
    await deleteDoc(this.docRef(id));
  }

  async get(id: string): Promise<T | null> {
    const snap = await getDoc(this.docRef(id));
    return snap.exists() ? (snap.data() as T) : null;
  }

  async listBy(field: keyof T, value: any, max = 25): Promise<T[]> {
    const q = query(this.colRef(), where(field as string, '==', value), limit(max));
    const sn = await getDocs(q);
    return sn.docs.map(d => d.data() as T);
  }
}
