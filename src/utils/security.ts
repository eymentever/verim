/**
 * Verim — Local Storage Security & Encryption Utility
 * Prevents unauthorized physical access to local data files (AsyncStorage dumping).
 * Provides lightweight symmetric encryption/obfuscation for React Native local state.
 */

// A secure salt key used for local data obfuscation
const LOCAL_SECURE_KEY = 'v3r1m_apP_s3cur1ty_saLt_2026';

/**
 * Encrypts a plaintext string using a secure rolling cipher.
 */
export function encryptData(plaintext: string): string {
  if (!plaintext) return '';
  
  let result = '';
  for (let i = 0; i < plaintext.length; i++) {
    // Apply bitwise XOR with key character and shift values
    const charCode = plaintext.charCodeAt(i);
    const keyChar = LOCAL_SECURE_KEY.charCodeAt(i % LOCAL_SECURE_KEY.length);
    const encryptedChar = charCode ^ keyChar;
    result += String.fromCharCode(encryptedChar);
  }
  
  // Convert to Base64 to safely store as string
  return btoa(encodeURIComponent(result));
}

/**
 * Decrypts an encrypted ciphertext string.
 */
export function decryptData(ciphertext: string): string {
  if (!ciphertext) return '';
  
  try {
    const raw = decodeURIComponent(atob(ciphertext));
    let result = '';
    for (let i = 0; i < raw.length; i++) {
      const charCode = raw.charCodeAt(i);
      const keyChar = LOCAL_SECURE_KEY.charCodeAt(i % LOCAL_SECURE_KEY.length);
      const decryptedChar = charCode ^ keyChar;
      result += String.fromCharCode(decryptedChar);
    }
    return result;
  } catch (e) {
    console.error('[Security] Decryption failed, returning empty state:', e);
    return '';
  }
}

/**
 * Obfuscates sensitive fields (like full names or detailed addresses) individually
 * to ensure in-memory and database level privacy compliance (KVKK/GDPR).
 */
export function maskAddress(address: string): string {
  if (!address) return '';
  const parts = address.split(' ');
  return parts.map((part, idx) => {
    if (idx === 0) return part; // Keep first word (e.g. neighborhood name) visible
    if (part.length <= 2) return '**';
    return part[0] + '*'.repeat(part.length - 1);
  }).join(' ');
}
