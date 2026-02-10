import { NextRequest, NextResponse } from 'next/server';
import shopify from '@/lib/shopify';
import { PrismaClient } from '@prisma/client';
import { Session } from '@shopify/shopify-api';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const hmac = request.headers.get('x-shopify-hmac-sha256');
    const topic = request.headers.get('x-shopify-topic');
    const shop = request.headers.get('x-shopify-shop-domain');

    // ... validation ...

    // DB'den Shop ve Token al
    const shopRecord = await prisma.shop.findUnique({
      where: { shopDomain: shop! },
    });

    if (!shopRecord || !shopRecord.accessToken) {
      console.error('Webhook: Shop veya token bulunamadı:', shop);
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Session oluştur
    const session = new Session({
      id: shopRecord.id,
      shop: shop!,
      state: 'state',
      isOnline: false,
      accessToken: shopRecord.accessToken,
    });

    // ... coding ...

    const orderData = JSON.parse(body);

    const isValid = await shopify.webhooks.validate({
      rawBody: body,
      rawRequest: request as any,
      rawResponse: NextResponse as any,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 401 });
    }

    // COD siparişi mi kontrol et (tags veya note'dan)
    const isCODOrder = orderData.tags?.includes('COD') ||
      orderData.tags?.includes('WhatsApp-Verified') ||
      orderData.note?.includes('Kapıda Ödeme');

    const whatsappVerified = orderData.note_attributes?.find(
      (attr: any) => attr.name === 'whatsapp_verified'
    )?.value === 'true';

    const verifiedPhone = orderData.note_attributes?.find(
      (attr: any) => attr.name === 'verified_phone'
    )?.value;

    const codSelected = orderData.note_attributes?.find(
      (attr: any) => attr.name === 'cod_selected'
    )?.value === 'true';

    // COD siparişi için conversion tracking
    if (isCODOrder || (codSelected && whatsappVerified)) {
      console.log('COD Order with WhatsApp verification:', {
        orderId: orderData.id,
        orderNumber: orderData.order_number,
        customer: orderData.customer,
        verifiedPhone: verifiedPhone,
        total: orderData.total_price,
      });

    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}