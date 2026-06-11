import { Injectable } from "@angular/core";
import { CryptoSessionService } from "./crypto-session.service";

@Injectable({
    providedIn: 'root'
})
export class RsaService {
    constructor(private cryptoSessionService: CryptoSessionService) { }
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

        await this.saveKeyPairToStorage(this.keyPair); // ✅ Store keys in IndexedDB
    }

    async exportPublicKeyPEM(): Promise<string> {
        if (!this.keyPair) {
            this.keyPair = await this.getKeyPairFromStorage();
        }

        const spki = await crypto.subtle.exportKey('spki', this.keyPair.publicKey);
        const base64 = this.arrayBufferToBase64(spki);
        return this.wrapPem(base64, 'PUBLIC KEY');
    }

    // 🔐 Store keys in IndexedDB using structured clone
    private async saveKeyPairToStorage(keyPair: CryptoKeyPair) {
        const privateKey = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
        const publicKey = await crypto.subtle.exportKey('spki', keyPair.publicKey);

        localStorage.setItem('rsa-private', btoa(String.fromCharCode(...new Uint8Array(privateKey))));
        localStorage.setItem('rsa-public', btoa(String.fromCharCode(...new Uint8Array(publicKey))));
    }

    private async getKeyPairFromStorage(): Promise<CryptoKeyPair> {
        const privateB64 = localStorage.getItem('rsa-private');
        const publicB64 = localStorage.getItem('rsa-public');

        if (!privateB64 || !publicB64) {
            throw new Error('Key pair not found in storage');
        }

        const privateKey = await crypto.subtle.importKey(
            'pkcs8',
            this.base64ToArrayBuffer(privateB64),
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256'
            },
            true,
            ['decrypt']
        );

        const publicKey = await crypto.subtle.importKey(
            'spki',
            this.base64ToArrayBuffer(publicB64),
            {
                name: 'RSA-OAEP',
                hash: 'SHA-256'
            },
            true,
            ['encrypt']
        );

        return { publicKey, privateKey };
    }


    private wrapPem(base64: string, label: string): string {
        const lines = base64.match(/.{1,64}/g)!.join('\n');
        return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
    }

    async decryptAesKey(base64Encrypted: string): Promise<void> {
        const encryptedBytes = this.base64ToArrayBuffer(base64Encrypted);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'RSA-OAEP' },
            this.keyPair.privateKey,
            encryptedBytes
        );

        const decryptedStr = new TextDecoder().decode(decrypted);
        const [ivBase64, keyBase64] = decryptedStr.split(":");

        const ivBuffer = this.base64ToUint8Array(ivBase64);
        const keyBuffer = this.base64ToArrayBuffer(keyBase64);

        const aesKey = await crypto.subtle.importKey(
            "raw",
            keyBuffer,
            { name: "AES-CBC" },
            true,
            ["encrypt", "decrypt"]
        );

        // Store securely in memory, not localStorage
        this.cryptoSessionService.setAesKeyAndIv(aesKey, ivBuffer);

        //Clear RSA key from localStorage (optional)
        this.clearKeys();
    }
    async aesEncrypt(plainText: string): Promise<string> {
        const aesData = this.cryptoSessionService.getAesKeyAndIv();
        if (!aesData) throw new Error("AES key/IV not in memory");

        const { key, iv }: any = aesData;

        const encoded = new TextEncoder().encode(plainText);
        const encrypted = await crypto.subtle.encrypt(
            { name: "AES-CBC", iv },
            key,
            encoded
        );

        return this.arrayBufferToBase64(encrypted);
    }
    async aesDecrypt(encryptedBase64: string): Promise<string> {
        const aesData = this.cryptoSessionService.getAesKeyAndIv();
        if (!aesData) throw new Error("AES key/IV not in memory");

        const { key, iv }: any = aesData;
        const encryptedBuffer = this.base64ToArrayBuffer(encryptedBase64);

        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-CBC", iv },
            key,
            encryptedBuffer
        );

        return new TextDecoder().decode(decrypted);
    }

    base64ToUint8Array(base64: string): Uint8Array {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }
    base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    arrayBufferToBase64(buffer: ArrayBuffer): string {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        bytes.forEach(b => binary += String.fromCharCode(b));
        return btoa(binary);
    }

    clearKeys() {
        localStorage.removeItem('rsa-private');
        localStorage.removeItem('rsa-public');
    }
    clearAesKey() {
        localStorage.removeItem('aesIv');
        localStorage.removeItem('aesKey');
    }
}