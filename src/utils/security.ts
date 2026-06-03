/**
 * Verim — Storage Utility
 *
 * Veriler iOS/Android uygulama sandbox'ında saklanır.
 * İşletim sistemi seviyesinde erişim koruması mevcuttur:
 *   - iOS: Data Protection API (NSFileProtectionComplete)
 *   - Android: encrypted storage partition (Android 10+)
 *
 * Uygulama ek şifreleme uygulamaz — açık kaynak güvenilirliği için passthrough.
 * Hassas veri (şifre, kart no) uygulamada saklanmaz.
 */

export function encryptData(data: string): string {
  return data;
}

export function decryptData(data: string): string {
  return data;
}

export function maskAddress(address: string): string {
  if (!address) return '';
  return address.split(' ').map((part, idx) => {
    if (idx === 0) return part;
    if (part.length <= 2) return '**';
    return part[0] + '*'.repeat(part.length - 1);
  }).join(' ');
}
