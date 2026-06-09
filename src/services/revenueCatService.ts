/**
 * RevenueCat In-App Purchase Servisi
 * Gerçek entegrasyon: react-native-purchases (RevenueCat SDK)
 *
 * Kurulum:
 *   npx expo install react-native-purchases
 *
 * App Store Connect & Google Play Console'da ürün ID'leri oluşturulduktan sonra
 * aşağıdaki PRODUCT_IDS ile eşleştirilmeli.
 */

export const RC_API_KEY = {
  ios: 'appl_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',       // App Store Connect'ten alınır
  android: 'goog_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',   // Google Play Console'dan alınır
};

export const PRODUCT_IDS = {
  pro_monthly:    'verim_pro_monthly_v1',
  pro_yearly:     'verim_pro_yearly_v1',
  landlord_monthly: 'verim_landlord_monthly_v1',
  landlord_yearly:  'verim_landlord_yearly_v1',
} as const;

export type ProductID = typeof PRODUCT_IDS[keyof typeof PRODUCT_IDS];

export interface RCPackage {
  identifier: string;
  productId: ProductID;
  price: number;
  priceString: string;
  period: 'monthly' | 'yearly';
  tier: 'pro' | 'landlord';
}

export interface PurchaseResult {
  success:      boolean;
  tier:         'pro' | 'landlord' | null;
  billingCycle: 'monthly' | 'yearly';
  expiresAt:    string | null;
  error?:       string;
}

/**
 * SDK'yı başlat — App.tsx veya _layout.tsx içinde çağır.
 * Gerçek kod:
 *   import Purchases from 'react-native-purchases';
 *   Purchases.configure({ apiKey: RC_API_KEY.ios });
 */
export async function initRevenueCat(): Promise<void> {
  // import Purchases from 'react-native-purchases';
  // const key = Platform.OS === 'ios' ? RC_API_KEY.ios : RC_API_KEY.android;
  // Purchases.configure({ apiKey: key });
  console.log('[RevenueCat] SDK initialized (placeholder)');
}

/**
 * Kullanılabilir paketleri getir.
 */
export async function getOfferings(): Promise<RCPackage[]> {
  // const offerings = await Purchases.getOfferings();
  // return offerings.current?.availablePackages.map(mapPackage) ?? [];

  // Mock offerings:
  return [
    { identifier: '$rc_monthly', productId: PRODUCT_IDS.pro_monthly,    price: 49.99,   priceString: '₺49,99/ay',   period: 'monthly', tier: 'pro' },
    { identifier: '$rc_annual',  productId: PRODUCT_IDS.pro_yearly,     price: 449.99,  priceString: '₺449,99/yıl', period: 'yearly',  tier: 'pro' },
    { identifier: '$rc_land_m',  productId: PRODUCT_IDS.landlord_monthly, price: 149.99, priceString: '₺149,99/ay', period: 'monthly', tier: 'landlord' },
    { identifier: '$rc_land_y',  productId: PRODUCT_IDS.landlord_yearly,  price: 1399.99, priceString: '₺1.399,99/yıl', period: 'yearly', tier: 'landlord' },
  ];
}

/**
 * Satın alma işlemi başlat.
 */
export async function purchasePackage(pkg: RCPackage): Promise<PurchaseResult> {
  try {
    // const { customerInfo } = await Purchases.purchasePackage(rcPackage);
    // const isPremium = customerInfo.entitlements.active['pro'] !== undefined;

    // Simülasyon:
    await new Promise((r) => setTimeout(r, 1500));
    const expires = new Date();
    expires.setMonth(expires.getMonth() + (pkg.period === 'yearly' ? 12 : 1));

    return {
      success:      true,
      tier:         pkg.tier,
      billingCycle: pkg.period,
      expiresAt:    expires.toISOString(),
    };
  } catch (e: any) {
    return { success: false, tier: null, billingCycle: 'monthly', expiresAt: null, error: e?.message ?? 'Satın alma başarısız.' };
  }
}

/**
 * Mevcut abonelik durumunu kontrol et (uygulama açılışında çağır).
 */
export async function restorePurchases(): Promise<PurchaseResult> {
  try {
    // const customerInfo = await Purchases.restorePurchases();
    // Entitlement kontrolü...

    await new Promise((r) => setTimeout(r, 800));
    // Simülasyonda her zaman free döner:
    // Gerçek entegrasyonda: billingCycle customerInfo'dan okunur
    return { success: true, tier: null, billingCycle: 'monthly', expiresAt: null };
  } catch (e: any) {
    return { success: false, tier: null, billingCycle: 'monthly', expiresAt: null, error: e?.message };
  }
}

/**
 * CustomerInfo'dan premium durumu çıkar.
 * Gerçek entegrasyonda Purchases.addCustomerInfoUpdateListener ile dinlenir.
 */
export function extractTierFromCustomerInfo(customerInfo: any): 'free' | 'pro' | 'landlord' {
  if (!customerInfo?.entitlements?.active) return 'free';
  if (customerInfo.entitlements.active['landlord']) return 'landlord';
  if (customerInfo.entitlements.active['pro']) return 'pro';
  return 'free';
}
