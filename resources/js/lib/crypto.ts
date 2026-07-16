import CryptoJS from 'crypto-js';

/**
 * Derive conversation key from conversation ID using iterative HMAC-SHA256
 */
export function deriveConversationKey(conversationId: number): string {
    const password = `secure_conv_${conversationId}`;
    const salt = 'jkchat_salt_2026';
    
    // Initial HMAC pass
    let hash = CryptoJS.HmacSHA256(salt, password);
    
    // 1000 iteration rounds of HMAC-SHA256
    for (let i = 0; i < 1000; i++) {
        hash = CryptoJS.HmacSHA256(hash, password);
    }
    
    return hash.toString(CryptoJS.enc.Base64);
}

/**
 * Encrypt plain text using AES-256-CBC and a derived conversation key
 */
export function encryptText(plainText: string, keyBase64: string): { ciphertext: string; iv: string } {
    const key = CryptoJS.enc.Base64.parse(keyBase64);
    // Generate a secure random 16-byte initialization vector (IV)
    const iv = CryptoJS.lib.WordArray.random(16);
    const ivBase64 = iv.toString(CryptoJS.enc.Base64);
    
    const encrypted = CryptoJS.AES.encrypt(plainText, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    
    return {
        ciphertext: encrypted.toString(),
        iv: ivBase64
    };
}

/**
 * Decrypt cipher text using AES-256-CBC and the derived conversation key
 */
export function decryptText(ciphertext: string, keyBase64: string, ivBase64: string): string {
    try {
        const key = CryptoJS.enc.Base64.parse(keyBase64);
        const iv = CryptoJS.enc.Base64.parse(ivBase64);
        
        const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });
        
        const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
        if (!plaintext) {
            return '[Decryption Error]';
        }
        return plaintext;
    } catch (err) {
        console.error('E2EE Decryption error:', err);
        return '[Decryption Error]';
    }
}

/**
 * Encrypt plain text using a custom IV
 */
export function encryptTextWithIV(plainText: string, keyBase64: string, ivBase64: string): string {
    const key = CryptoJS.enc.Base64.parse(keyBase64);
    const iv = CryptoJS.enc.Base64.parse(ivBase64);
    const encrypted = CryptoJS.AES.encrypt(plainText, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
}

/**
 * Generate secure random base64 key (256-bit)
 */
export function generateRandomKey(): string {
    return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Base64);
}

/**
 * Generate secure random base64 IV (128-bit)
 */
export function generateRandomIV(): string {
    return CryptoJS.lib.WordArray.random(16).toString(CryptoJS.enc.Base64);
}

/**
 * Encrypt File/Blob using AES-256-CBC.
 */
export function encryptBlob(blob: Blob, keyBase64: string, ivBase64: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const dataUrl = reader.result as string;
                const base64Str = dataUrl.split(',')[1];
                const plainWordArray = CryptoJS.enc.Base64.parse(base64Str);
                const key = CryptoJS.enc.Base64.parse(keyBase64);
                const iv = CryptoJS.enc.Base64.parse(ivBase64);

                const encrypted = CryptoJS.AES.encrypt(plainWordArray, key, {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                });

                const encryptedBase64 = encrypted.ciphertext.toString(CryptoJS.enc.Base64);

                // Base64 to Blob conversion
                const byteCharacters = atob(encryptedBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const encryptedBlob = new Blob([byteArray], { type: blob.type });
                resolve(encryptedBlob);
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
}

/**
 * Decrypt plain text using a custom IV
 */
export function decryptTextWithIV(ciphertext: string, keyBase64: string, ivBase64: string): string {
    const key = CryptoJS.enc.Base64.parse(keyBase64);
    const iv = CryptoJS.enc.Base64.parse(ivBase64);
    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

/**
 * Decrypt a File/Blob using AES-256-CBC.
 */
export function decryptBlob(encryptedBlob: Blob, keyBase64: string, ivBase64: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const dataUrl = reader.result as string;
                const base64Str = dataUrl.split(',')[1];
                const encryptedWordArray = CryptoJS.enc.Base64.parse(base64Str);
                const key = CryptoJS.enc.Base64.parse(keyBase64);
                const iv = CryptoJS.enc.Base64.parse(ivBase64);

                const decrypted = CryptoJS.AES.decrypt({ ciphertext: encryptedWordArray } as any, key, {
                    iv: iv,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                });

                const decryptedBase64 = decrypted.toString(CryptoJS.enc.Base64);

                // Base64 to Blob conversion
                const byteCharacters = atob(decryptedBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const decryptedBlob = new Blob([byteArray], { type: encryptedBlob.type });
                resolve(decryptedBlob);
            } catch (e) {
                reject(e);
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(encryptedBlob);
    });
}
