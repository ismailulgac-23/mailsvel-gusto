import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { fetchWithCache } from '@/lib/cache';

const prisma = new PrismaClient();


/**
 * Meta entegrasyon durumu kontrolü
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

        // Meta integration ve pixels bilgilerini al
        const integration = await prisma.metaIntegration.findUnique({
            where: { shopId },
            include: {
                pixels: {
                    where: { isActive: true },
                },
            },
        });

        if (!integration) {
            return NextResponse.json({
                connected: false,
                integration: null,
                pixels: [],
            });
        }

        return NextResponse.json({
            connected: true,
            integration: {
                id: integration.id,
                businessAccountId: integration.metaBusinessAccountId,
                isActive: integration.isActive,
                tokenExpiry: integration.metaTokenExpiry,
                createdAt: integration.createdAt,
            },
            pixels: integration.pixels.map((p: any) => ({
                id: p.id,
                pixelId: p.pixelId,
                pixelName: p.pixelName,
                isActive: p.isActive,
                hasCAPIToken: !!p.capiAccessToken,
            })),

        });
    } catch (error) {
        console.error('Entegrasyon durumu kontrolü hatası:', error);
        return NextResponse.json(
            { error: 'Durum kontrolü yapılırken hata oluştu' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Meta entegrasyonu kaldırma
 */
export async function DELETE(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const shopId = searchParams.get('shopId');

        if (!shopId) {
            return NextResponse.json(
                { error: 'Shop ID gerekli' },
                { status: 400 }
            );
        }

        // Integration'ı sil (cascade ile pixel'ler de silinir)
        await prisma.metaIntegration.delete({
            where: { shopId },
        });

        return NextResponse.json({
            success: true,
            message: 'Meta entegrasyonu başarıyla kaldırıldı',
        });
    } catch (error) {
        console.error('Entegrasyon kaldırma hatası:', error);
        return NextResponse.json(
            { error: 'Entegrasyon kaldırılırken hata oluştu' },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}
