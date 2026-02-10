import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Shop bilgilerini getir
 * URL'den shop parametresini alır ve o shop'un bilgilerini döndürür
 */
export async function GET(request: NextRequest) {
    try {
        // URL'den shop parametresini al
        const searchParams = request.nextUrl.searchParams;
        const shopDomain = searchParams.get('shop');

        console.log('🔍 [SHOP INFO] Shop bilgisi istendi:', shopDomain);

        if (!shopDomain) {
            // Shop parametresi yoksa, ilk shop'u döndür (fallback)
            const firstShop = await prisma.shop.findFirst({
                orderBy: { createdAt: 'desc' },
            });

            if (!firstShop) {
                console.log('❌ [SHOP INFO] Hiç shop bulunamadı');
                return NextResponse.json(
                    { error: 'Shop bulunamadı. Lütfen uygulamayı yükleyin.' },
                    { status: 404 }
                );
            }

            console.log('✅ [SHOP INFO] İlk shop döndürüldü:', firstShop.shopDomain);
            return NextResponse.json({
                shopId: firstShop.id,
                shopDomain: firstShop.shopDomain,
                accessToken: firstShop.accessToken ? 'exists' : null,
                isActive: firstShop.isActive,
            });
        }

        // Belirtilen shop'u bul
        const shop = await prisma.shop.findUnique({
            where: { shopDomain },
        });

        if (!shop) {
            console.log('❌ [SHOP INFO] Shop bulunamadı:', shopDomain);
            return NextResponse.json(
                { error: 'Shop bulunamadı veya yetkilendirilmemiş' },
                { status: 404 }
            );
        }

        if (!shop.accessToken) {
            console.log('❌ [SHOP INFO] Access token yok:', shopDomain);
            return NextResponse.json(
                { error: 'Shop yetkilendirilmemiş' },
                { status: 401 }
            );
        }

        console.log('✅ [SHOP INFO] Shop bilgisi döndürüldü:', shop.shopDomain);
        return NextResponse.json({
            shopId: shop.id,
            shopDomain: shop.shopDomain,
            accessToken: 'exists',
            isActive: shop.isActive,
            codEnabled: shop.codEnabled,
            whatsappEnabled: shop.whatsappEnabled,
        });
    } catch (error: any) {
        console.error('❌ [SHOP INFO] Hata:', error);
        return NextResponse.json(
            { error: 'Shop bilgisi alınamadı', details: error.message },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
