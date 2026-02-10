import { NextRequest, NextResponse } from 'next/server';
import shopify from '@/lib/shopify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    
    // HMAC doğrulama
    const isValid = await shopify.webhooks.validate({
      rawBody: body,
      rawRequest: request as any,
      rawResponse: NextResponse as any,
    });

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 401 });
    }

    const data = JSON.parse(body);
    const shop = data.domain;

    console.log('App uninstalled from shop:', shop);

    // TODO: Shop verilerini temizle
    // await prisma.shop.update({
    //   where: { shopDomain: shop },
    //   data: { isActive: false },
    // });
    
    // await prisma.session.deleteMany({
    //   where: { shop },
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Uninstall webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}