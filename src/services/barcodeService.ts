/**
 * Barkod / QR Okuma Servisi — Placeholder
 * Gerçek entegrasyon: expo-barcode-scanner veya @zxing/browser
 */

export interface BillBarcodeResult {
  invoiceNo: string;
  amount: number;        // TL
  dueDate: string;       // ISO date
  subscriberNo?: string;
  issuerCode?: string;
  rawBarcode: string;
}

/**
 * Fatura barkodunu çözümle (interaktif ödeme barkodu - PDF417 / QR)
 * Türkiye'de faturalar genellikle GS1-128 veya PDF417 içerir.
 */
export async function decodeBillBarcode(barcodeData: string): Promise<BillBarcodeResult> {
  await new Promise((r) => setTimeout(r, 800)); // Simülasyon gecikmesi

  // Gerçek parser burada çalışır:
  // - İGDAŞ: 24 haneli barkod → [abone no][dönem][tutar][son ödeme]
  // - İSKİ:  QR → JSON payload
  // Şimdilik mock dönüyoruz:
  const amount = Math.round(Math.random() * 500 + 100);
  const due = new Date();
  due.setDate(due.getDate() + 14);

  return {
    invoiceNo: `INV-${Date.now()}`,
    amount,
    dueDate: due.toISOString().split('T')[0],
    subscriberNo: barcodeData.slice(0, 8) || '00000001',
    issuerCode: 'TR-MUN',
    rawBarcode: barcodeData,
  };
}

/**
 * Torch / Flash kontrolü için hook yardımcısı
 * Kullanım: expo-camera CameraView ref üzerinden
 */
export function useTorchOnMount() {
  // expo-camera ile entegrasyon:
  // const cameraRef = useRef<CameraView>(null);
  // useFocusEffect(() => { cameraRef.current?.setTorchEnabled(true); });
  // Gerçek uygulamada bu hook scan.tsx içinde kullanılır.
  return { torchSupported: true };
}
