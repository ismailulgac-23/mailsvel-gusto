import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Meta Pixel listeleme endpoint'i
 * Kullanıcının Meta Business hesabındaki tüm pixel'leri listeler
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const shopId = searchParams.get('shopId');

        if (!shopId) {
            return NextResponse.json(
                { error: 'Shop ID gerekli' },
                { status: 400 }
            );
        }

        // Meta integration kontrolü
        const integration = await prisma.metaIntegration.findUnique({
            where: { shopId },
        });

        if (!integration) {
            return NextResponse.json(
                { error: 'Meta entegrasyonu bulunamadı', connected: false },
                { status: 404 }
            );
        }

        // Meta Graph API üzerinden pixel'leri al
        // İlk olarak business'tan dene
        let pixelsUrl = `https://graph.facebook.com/v18.0/${integration.metaBusinessAccountId}/adspixels?fields=id,name&access_token=${integration.metaAccessToken}`;

        let response = await fetch(pixelsUrl);
        let data = await response.json();

        // Eğer business'tan alınamazsa, ad account'ları dene
        if (!response.ok && data.error) {
            console.log('Business üzerinden pixel alınamadı, ad accounts deneniyor...');

            // Tüm ad account'ları al
            const adAccountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name&access_token=${integration.metaAccessToken}`;
            const adAccountsResponse = await fetch(adAccountsUrl);
            const adAccountsData = await adAccountsResponse.json();

            if (adAccountsResponse.ok && adAccountsData.data && adAccountsData.data.length > 0) {
                // İlk ad account'un pixel'lerini al
                const adAccountId = adAccountsData.data[0].id; // act_xxxx formatında
                pixelsUrl = `https://graph.facebook.com/v18.0/${adAccountId}/adspixels?fields=id,name&access_token=${integration.metaAccessToken}`;

                response = await fetch(pixelsUrl);
                data = await response.json();
            }
        }

        if (!response.ok) {
            console.error('Meta Pixel listesi alınamadı:', data);
            return NextResponse.json(
                {
                    error: 'Pixel listesi alınamadı',
                    details: data,
                    suggestion: 'Meta Business Manager\'da en az bir Pixel oluşturduğunuzdan emin olun.'
                },
                { status: 500 }
            );
        }


        // Veritabanındaki kayıtlı pixel'leri al
        const savedPixels = await prisma.metaPixel.findMany({
            where: { metaIntegrationId: integration.id },
        });

        // Pixel'leri birleştir
        const pixels = (data.data || []).map((pixel: any) => {
            const saved = savedPixels.find((p: any) => p.pixelId === pixel.id);
            return {
                ...pixel,
                saved: !!saved,
                isActive: saved?.isActive || false,
                hasCAPIToken: !!saved?.capiAccessToken,
            };
        });


        return NextResponse.json({
            connected: true,
            pixels,
            integration: {
                id: integration.id,
                businessAccountId: integration.metaBusinessAccountId,
                isActive: integration.isActive,
            },
        });
    } catch (error) {
        console.error('Pixel listesi hatası:', error);
        return NextResponse.json(
            { error: 'Pixel listesi alınırken hata oluştu' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Meta Pixel kaydetme endpoint'i
 * Seçilen pixel'i veritabanına kaydeder ve CAPI token üretir
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { shopId, pixelId, pixelName } = body;

        if (!shopId || !pixelId || !pixelName) {
            return NextResponse.json(
                { error: 'Shop ID, Pixel ID ve Pixel Name gerekli' },
                { status: 400 }
            );
        }

        // Meta integration kontrolü
        const integration = await prisma.metaIntegration.findUnique({
            where: { shopId },
        });

        if (!integration) {
            return NextResponse.json(
                { error: 'Meta entegrasyonu bulunamadı' },
                { status: 404 }
            );
        }

        // CAPI Access Token oluştur (System User Access Token)
        // Not: Bu gerçek üretimde Meta Business Manager'dan alınmalı
        // Şimdilik integration token'ı kullanıyoruz
        const capiToken = integration.metaAccessToken;

        // Pixel'i kaydet veya güncelle
        const pixel = await prisma.metaPixel.upsert({
            where: {
                metaIntegrationId_pixelId: {
                    metaIntegrationId: integration.id,
                    pixelId,
                },
            },
            create: {
                metaIntegrationId: integration.id,
                pixelId,
                pixelName,
                capiAccessToken: capiToken,
                isActive: true,
            },
            update: {
                pixelName,
                capiAccessToken: capiToken,
                isActive: true,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            pixel,
            message: 'Pixel başarıyla kaydedildi',
        });
    } catch (error) {
        console.error('Pixel kaydetme hatası:', error);
        return NextResponse.json(
            { error: 'Pixel kaydedilirken hata oluştu' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Meta Pixel silme endpoint'i
 */
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const shopId = searchParams.get('shopId');
        const pixelId = searchParams.get('pixelId');

        if (!shopId || !pixelId) {
            return NextResponse.json(
                { error: 'Shop ID ve Pixel ID gerekli' },
                { status: 400 }
            );
        }

        // Meta integration kontrolü
        const integration = await prisma.metaIntegration.findUnique({
            where: { shopId },
        });

        if (!integration) {
            return NextResponse.json(
                { error: 'Meta entegrasyonu bulunamadı' },
                { status: 404 }
            );
        }

        // Pixel'i sil
        await prisma.metaPixel.deleteMany({
            where: {
                metaIntegrationId: integration.id,
                pixelId,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Pixel başarıyla silindi',
        });
    } catch (error) {
        console.error('Pixel silme hatası:', error);
        return NextResponse.json(
            { error: 'Pixel silinirken hata oluştu' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
