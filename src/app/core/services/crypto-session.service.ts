import { Injectable } from '@angular/core';
@Injectable({ providedIn: 'root' })
export class CryptoSessionService {
  private sessionCryptoKey: CryptoKey | null = null; // Used to wrap AES
  private aesKey: CryptoKey | null = null;           // Final AES-CBC key
  private aesIv: Uint8Array | null = null;

  async generateSessionKey(): Promise<void> {
    this.sessionCryptoKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      false, // not extractable
      ['encrypt', 'decrypt', 'wrapKey', 'unwrapKey']
    );
  }

  setAesKeyAndIv(key: CryptoKey, iv: Uint8Array) {
    this.aesKey = key;
    this.aesIv = iv;
  }

  getAesKeyAndIv(): { key: CryptoKey, iv: Uint8Array } | null {
    if (this.aesKey && this.aesIv) {
      return { key: this.aesKey, iv: this.aesIv };
    }
    return null;
  }

  getSessionKey(): CryptoKey | null {
    return this.sessionCryptoKey;
  }

  clear() {
    this.sessionCryptoKey = null;
    this.aesKey = null;
    this.aesIv = null;
  }
}
