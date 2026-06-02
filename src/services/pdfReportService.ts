/**
 * PDF Sayaç Teslim Tutanağı Servisi
 * Gerçek entegrasyon: react-native-html-to-pdf veya expo-print
 */

import { ConsumptionLog } from '../store/useUtilityStore';

export interface HandoverPDFInput {
  propertyName: string;
  propertyAddress: string;
  city: string;
  district: string;
  tenantName: string;
  landlordName: string;
  handoverDate: string;         // ISO
  waterIndex: number;
  gasIndex: number;
  deviceLocation?: { lat: number; lng: number };
  logs: ConsumptionLog[];
}

export interface HandoverPDFResult {
  filePath: string;    // cihaz üzerindeki dosya yolu
  htmlContent: string; // önizleme için ham HTML
}

function generateHTML(input: HandoverPDFInput): string {
  const date = new Date(input.handoverDate).toLocaleDateString('tr-TR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });

  const gpsText = input.deviceLocation
    ? `${input.deviceLocation.lat.toFixed(5)}, ${input.deviceLocation.lng.toFixed(5)}`
    : 'GPS verisi mevcut değil';

  return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; color: #111; padding: 40px; }
  h1 { color: #6C63FF; font-size: 22px; }
  .badge { background: #F0EEFF; color: #6C63FF; padding: 4px 10px; border-radius: 12px; font-size: 12px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  th { background: #6C63FF; color: #fff; padding: 8px 12px; text-align: left; font-size: 13px; }
  td { padding: 8px 12px; border-bottom: 1px solid #EEE; font-size: 13px; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 60px; }
  .sig-box { text-align: center; width: 200px; border-top: 1px solid #111; padding-top: 8px; font-size: 12px; }
  .footer { font-size: 10px; color: #999; margin-top: 40px; text-align: center; }
</style>
</head>
<body>
  <h1>💡 Verim — Sayaç Teslim Tutanağı</h1>
  <p><span class="badge">Resmi Belge</span> &nbsp; Tarih: <strong>${date}</strong></p>

  <table>
    <tr><th colspan="2">Mülk Bilgileri</th></tr>
    <tr><td>Mülk Adı</td><td>${input.propertyName}</td></tr>
    <tr><td>Adres</td><td>${input.propertyAddress}</td></tr>
    <tr><td>Şehir / İlçe</td><td>${input.city} / ${input.district}</td></tr>
    <tr><th colspan="2">Taraflar</th></tr>
    <tr><td>Kiracı</td><td>${input.tenantName}</td></tr>
    <tr><td>Ev Sahibi</td><td>${input.landlordName}</td></tr>
    <tr><th colspan="2">Sayaç Değerleri (Teslim Anı)</th></tr>
    <tr><td>💧 Su Endeksi</td><td><strong>${input.waterIndex} m³</strong></td></tr>
    <tr><td>🔥 Doğalgaz Endeksi</td><td><strong>${input.gasIndex} m³</strong></td></tr>
    <tr><td>📍 GPS Konumu</td><td>${gpsText}</td></tr>
    <tr><td>Oluşturulma Zamanı</td><td>${new Date().toLocaleString('tr-TR')}</td></tr>
  </table>

  <p style="font-size:12px;color:#555;">Son 3 aylık tüketim geçmişi ektedir. Bu belge Verim uygulaması tarafından otomatik oluşturulmuştur.</p>

  <div class="sig-row">
    <div class="sig-box">Kiracı İmzası<br/>${input.tenantName}</div>
    <div class="sig-box">Ev Sahibi İmzası<br/>${input.landlordName}</div>
  </div>

  <div class="footer">Verim Uygulaması · verim.app · Bu belge elektronik imza ile geçerlidir.</div>
</body>
</html>`;
}

export async function generateHandoverPDF(input: HandoverPDFInput): Promise<HandoverPDFResult> {
  // Gerçek uygulama:
  // import * as Print from 'expo-print';
  // const { uri } = await Print.printToFileAsync({ html });
  // return { filePath: uri, htmlContent: html };

  const html = generateHTML(input);

  // Simülasyon — gerçek dosya yolu döner
  await new Promise((r) => setTimeout(r, 1200));

  return {
    filePath: `/storage/emulated/0/Downloads/verim_tutanak_${Date.now()}.pdf`,
    htmlContent: html,
  };
}
