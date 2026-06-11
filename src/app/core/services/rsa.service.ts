import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RsaService {
  keyPair!: CryptoKeyPair;

  async generateKeyPair(): Promise<void> {
    this.keyPair = await crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256'
      },
      true,
      ['encrypt', 'decrypt']
    );

    await this.saveKeyPairToStorage(this.keyPair);
  }

  private async saveKeyPairToStorage(keyPair: CryptoKeyPair) {
    const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);

    localStorage.setItem('rsa-private', btoa(String.fromCharCode(...new Uint8Array(privateKey))));
    localStorage.setItem('rsa-public', btoa(String.fromCharCode(...new Uint8Array(publicKey))));
  }

  async exportPublicKeyPEM(): Promise<string> {
    if (!this.keyPair) {
      this.keyPair = await this.getKeyPairFromStorage();
    }

    const spki = await crypto.subtle.exportKey('spki', this.keyPair.publicKey);
    const base64 = this.arrayBufferToBase64(spki);
    return this.wrapPem(base64, 'PUBLIC KEY');
  }

  async getKeyPairFromStorage(): Promise<CryptoKeyPair> {
    const privB64 = localStorage.getItem('rsa-private');
    const pubB64 = localStorage.getItem('rsa-public');
    if (!privB64 || !pubB64) {
      throw new Error("Keys not found in storage");
    }
    
    const privBuffer = Uint8Array.from(atob(privB64), c => c.charCodeAt(0));
    const pubBuffer = Uint8Array.from(atob(pubB64), c => c.charCodeAt(0));

    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privBuffer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['decrypt']
    );

    const publicKey = await crypto.subtle.importKey(
      'spki',
      pubBuffer,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt']
    );

    return { publicKey, privateKey };
  }

  arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  }

  wrapPem(base64: string, label: string): string {
    const matched = base64.match(/.{1,64}/g);
    const lines = matched ? matched.join('\n') : '';
    return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
  }
}
