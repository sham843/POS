import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CryptoService {
  sessionCryptoKey!: CryptoKey;

  async generateSessionKey(): Promise<void> {
    this.sessionCryptoKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // not extractable
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }
}
