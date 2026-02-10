import { PrismaClient } from '@prisma/client';

/**
 * Meta Conversions API (CAPI) Helper
 */
export async function sendMetaPurchaseEvent(
    prisma: PrismaClient,
    shopDomain: string,
    order: any,
    userInfo: any,
    clientIp: string | null,
    userAgent: string | null
) {
    try {
        console.log(`📡 [Meta CAPI] Shop: ${shopDomain} için pixel aranıyor...`);

        // 1. Shop'un aktif Meta entegrasyonunu bul
        const metaIntegration = await prisma.metaIntegration.findFirst({
            where: {
                shop: { shopDomain: shopDomain },
                isActive: true
            },
            include: {
                pixels: {
                    where: { isActive: true }
                }
            }
        });

        if (!metaIntegration) {
            console.log('⚠️ [Meta CAPI] Aktif Meta entegrasyonu bulunamadı.');
            return { success: false, reason: 'no_integration' };
        }

        if (!metaIntegration.pixels || metaIntegration.pixels.length === 0) {
            console.log('⚠️ [Meta CAPI] Aktif pixel bulunamadı.');
            return { success: false, reason: 'no_active_pixels' };
        }

        console.log(`✅ [Meta CAPI] ${metaIntegration.pixels.length} adet aktif pixel bulundu.`);

        const results = [];

        // 2. Her pixel için Purchase eventi gönder
        for (const pixel of metaIntegration.pixels) {
            if (!pixel.capiAccessToken && !metaIntegration.metaAccessToken) {
                console.log(`⚠️ [Meta CAPI] Pixel ${pixel.pixelId} için token yok.`);
                continue;
            }

            // CAPI Token önceliği: Pixel'e özel token > Integration token
            const accessToken = pixel.capiAccessToken || metaIntegration.metaAccessToken;
            const pixelId = pixel.pixelId;

            console.log(`📤 [Meta CAPI] Pixel ${pixelId} için Purchase eventi gönderiliyor...`);

            const eventTime = Math.floor(Date.now() / 1000);

            // Kullanıcı verilerini hashle (SHA256) - Meta gereksinimi
            // Not: Gerçek prodüksiyonda bu verilerin normalize edilip hashlenmesi gerekir
            // Şimdilik plain text gönderiyoruz, Meta otomatik hashleyebilir veya
            // daha sonra hashleme eklenebilir. Meta CAPI plain text de kabul edebilir
            // ancak best practice hashlemektir. Hızlı çözüm için şimdilik böyle bırakıyoruz.

            const eventData = {
                data: [
                    {
                        event_name: 'Purchase',
                        event_time: eventTime,
                        action_source: 'website',
                        event_source_url: `https://${shopDomain}`,
                        user_data: {
                            em: userInfo.email ? [sha256(userInfo.email)] : [],
                            ph: userInfo.phone ? [sha256(userInfo.phone)] : [],
                            fn: userInfo.firstName ? [sha256(userInfo.firstName)] : [],
                            ln: userInfo.lastName ? [sha256(userInfo.lastName)] : [],
                            ct: userInfo.city ? [sha256(userInfo.city)] : [],
                            country: userInfo.country ? [sha256(userInfo.country)] : [],
                            client_ip_address: clientIp,
                            client_user_agent: userAgent,
                        },
                        custom_data: {
                            currency: 'TRY',
                            value: order.total_price || 0,
                            order_id: order.id,
                            content_ids: order.line_items?.map((item: any) => item.variant_id || item.product_id),
                            content_type: 'product',
                            contents: order.line_items?.map((item: any) => ({
                                id: item.variant_id || item.product_id,
                                quantity: item.quantity,
                                item_price: item.price
                            })),
                            num_items: order.line_items?.length
                        }
                    }
                ],
                access_token: accessToken // Query param yerine body içinde de gönderilebilir ama URL daha garanti
            };

            // 3. Meta Graph API'ye POST isteği at
            const url = `https://graph.facebook.com/v18.0/${pixelId}/events?access_token=${accessToken}`;

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(eventData)
                });

                const responseData = await response.json();

                if (response.ok) {
                    console.log(`✅ [Meta CAPI] Event başarıyla gönderildi: Pixel ${pixelId}`);
                    results.push({ pixelId, success: true, eventId: responseData.fbtrace_id });
                } else {
                    console.error(`❌ [Meta CAPI] Hata (Pixel ${pixelId}):`, responseData);
                    results.push({ pixelId, success: false, error: responseData });
                }
            } catch (error) {
                console.error(`❌ [Meta CAPI] Fetch Hatası (Pixel ${pixelId}):`, error);
                results.push({ pixelId, success: false, error });
            }
        }

        return { success: true, results };
    } catch (error) {
        console.error('❌ [Meta CAPI] Genel Hata:', error);
        return { success: false, error };
    }
}

// Basit SHA-256 hash fonksiyonu (crypto API kullanarak)
// Next.js Edge Runtime veya Node.js ortamında çalışır
import crypto from 'crypto';

function sha256(text: string): string {
    if (!text) return '';
    // Normalize: lowercase ve trim
    const normalized = text.toLowerCase().trim();
    return crypto.createHash('sha256').update(normalized).digest('hex');
}
