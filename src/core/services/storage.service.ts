import { Injectable, inject } from '@angular/core';
import { Storage, uploadBytes, getDownloadURL, ref } from '@angular/fire/storage';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly storage = inject(Storage);

  async upload(path: string, data: Blob | ArrayBuffer | Uint8Array, contentType?: string): Promise<string> {
    const storageRef = ref(this.storage, path);
    const result = await uploadBytes(storageRef, data as any, contentType ? { contentType } : undefined);
    return await getDownloadURL(result.ref);
  }

  async getUrl(path: string): Promise<string> {
    const storageRef = ref(this.storage, path);
    return await getDownloadURL(storageRef);
  }
}
