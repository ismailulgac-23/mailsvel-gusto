import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Meta İşletme Hesaplarını ve Reklam Hesaplarını listeleme
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const shopId = searchParams.get('shopId');

        if (!shopId) {
            return NextResponse.json({ error: 'Shop ID gerekli' }, { status: 400 });
        }

        const integration = await prisma.metaIntegration.findUnique({
            where: { shopId },
        });

        if (!integration) {
            return NextResponse.json({ error: 'Entegrasyon bulunamadı' }, { status: 404 });
        }

        // 1. İşletme hesaplarını (Businesses) al
        const businessesUrl = `https://graph.facebook.com/v18.0/me/businesses?fields=id,name&access_token=${integration.metaAccessToken}`;
        const businessesRes = await fetch(businessesUrl);
        const businessesData = await businessesRes.json();

        // 2. Reklam hesaplarını (Ad Accounts) al (Yedek olarak veya bireysel hesaplar için)
        const adAccountsUrl = `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name&access_token=${integration.metaAccessToken}`;
        const adAccountsRes = await fetch(adAccountsUrl);
        const adAccountsData = await adAccountsRes.json();

        const accounts: { id: string; name: string; type: string }[] = [];

        if (businessesRes.ok && businessesData.data) {
            businessesData.data.forEach((b: any) => {
                accounts.push({ id: b.id, name: b.name, type: 'BUSINESS' });
            });
        }

        if (adAccountsRes.ok && adAccountsData.data) {
            adAccountsData.data.forEach((a: any) => {
                accounts.push({ id: a.id, name: a.name, type: 'AD_ACCOUNT' });
            });
        }

        return NextResponse.json({ accounts });
    } catch (error: any) {
        console.error('İşletme hesapları listeleme hatası:', error);
        return NextResponse.json({ error: 'Hesaplar alınamadı' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Seçilen hesabı kaydetme
 */
export async function POST(request: NextRequest) {
    try {
        const { shopId, accountId } = await request.json();

        if (!shopId || !accountId) {
            return NextResponse.json({ error: 'Shop ID ve Hesap ID gerekli' }, { status: 400 });
        }

        await prisma.metaIntegration.update({
            where: { shopId },
            data: {
                metaBusinessAccountId: accountId,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({ success: true, message: 'Hesap başarıyla seçildi' });
    } catch (error: any) {
        console.error('Hesap kaydetme hatası:', error);
        return NextResponse.json({ error: 'Hesap kaydedilemedi' }, { status: 500 });
    } finally {
        await prisma.$disconnect();
    }
}
