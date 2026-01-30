import { Injectable } from '@angular/core';
import { docData, DocumentReference } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { User } from '../models/user.model';
import { BaseFirestoreService } from './base-firestore.service';

@Injectable({ providedIn: 'root' })
export class UsersRepository extends BaseFirestoreService<User> {
  protected override collectionPath = 'users';

  doc$(id: string): Observable<User | undefined> {
    const ref = this.docRef(id) as DocumentReference<User>;
    return docData(ref, { idField: 'id' });
  }
}
