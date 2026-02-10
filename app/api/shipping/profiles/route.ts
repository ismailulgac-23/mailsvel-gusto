import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shop = searchParams.get('shop');

    if (!shop) {
      return NextResponse.json(
        { error: 'Shop parametresi gerekli' },
        { status: 400, headers: corsHeaders }
      );
    }

    console.log('📦 [SHIPPING] Kargo profilleri istendi:', shop);

    // Shop bilgisini al
    const shopRecord = await prisma.shop.findUnique({
      where: { shopDomain: shop },
    });

    if (!shopRecord || !shopRecord.accessToken) {
      return NextResponse.json(
        { error: 'Shop bulunamadı veya yetkilendirilmemiş' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Shopify'dan kargo bölgelerini çek (shipping zones)
    const shippingZonesUrl = `https://${shop}/admin/api/2025-04/shipping_zones.json`;
    
    const response = await fetch(shippingZonesUrl, {
      headers: {
        'X-Shopify-Access-Token': shopRecord.accessToken,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ [SHIPPING] Shopify API hatası:', error);
      
      // Hata olsa bile boş liste döndür (kargo seçimi opsiyonel)
      return NextResponse.json(
        {
          success: true,
          profiles: [],
          message: 'Kargo profilleri yüklenemedi, varsayılan kargo kullanılacak'
        },
        { headers: corsHeaders }
      );
    }

    const data = await response.json();
    const shippingZones = data.shipping_zones || [];

    console.log('✅ [SHIPPING] Kargo bölgeleri alındı:', shippingZones.length);

    // Tüm shipping rate'leri topla
    const allRates: any[] = [];
    shippingZones.forEach((zone: any) => {
      if (zone.price_based_shipping_rates) {
        zone.price_based_shipping_rates.forEach((rate: any) => {
          allRates.push({
            id: rate.id,
            name: rate.name,
            price: rate.price,
            zone: zone.name,
            type: 'price_based'
          });
        });
      }
      if (zone.weight_based_shipping_rates) {
        zone.weight_based_shipping_rates.forEach((rate: any) => {
          allRates.push({
            id: rate.id,
            name: rate.name,
            price: rate.price,
            zone: zone.name,
            type: 'weight_based'
          });
        });
      }
      if (zone.carrier_shipping_rate_providers) {
        zone.carrier_shipping_rate_providers.forEach((rate: any) => {
          allRates.push({
            id: rate.id,
            name: rate.carrier_service_id,
            price: '0.00',
            zone: zone.name,
            type: 'carrier'
          });
        });
      }
    });

    // Profilleri basitleştir
    const simplifiedProfiles = allRates.map((rate: any, index: number) => ({
      id: rate.id,
      name: rate.name,
      price: rate.price,
      zone: rate.zone,
      default: index === 0,
    }));

    return NextResponse.json(
      {
        success: true,
        profiles: simplifiedProfiles,
      },
      { headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ [SHIPPING] Hata:', error);
    return NextResponse.json(
      {
        error: 'Kargo profilleri alınırken hata oluştu',
        details: error?.message || 'Bilinmeyen hata',
      },
      { status: 500, headers: corsHeaders }
    );
  } finally {
    await prisma.$disconnect();
  }
}