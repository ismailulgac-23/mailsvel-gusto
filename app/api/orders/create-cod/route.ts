import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
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

export async function GET() {
  console.log('🧪 [COD API] GET test');

  return NextResponse.json(
    {
      status: 'OK',
      message: 'COD API is running (Next.js 14 App Router)',
      timestamp: new Date().toISOString(),
    },
    { headers: corsHeaders }
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('🚀 [COD API] POST çağrıldı');
    console.log('📦 Body:', JSON.stringify(body, null, 2));

    // Browser IP'yi request header'larından al
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const clientIp = forwardedFor?.split(',')[0] || realIp || req.headers.get('x-forwarded-for')?.split(',')[0] || null;

    const {
      shop,
      customerName,
      customerPhone,
      customerEmail,
      customerAddress,
      customerCity,
      customerCountry,
      customerZip,
      cartItems,
      totalAmount,
      cartToken,
      codPaymentType,
      landingPage,
      referringSite,
      userAgent,
    } = body;

    console.log('🌐 Client IP:', clientIp);

    // ZORUNLU KONTROLLER
    if (!customerName || !customerPhone || !customerAddress || !shop) {
      console.error('❌ Eksik zorunlu alanlar');
      return NextResponse.json(
        {
          error: 'Eksik zorunlu alanlar',
          required: ['shop', 'customerName', 'customerPhone', 'customerAddress'],
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Kapıda ödeme şekli kontrolü
    if (!codPaymentType || (codPaymentType !== 'cash' && codPaymentType !== 'card')) {
      console.error('❌ Kapıda ödeme şekli seçilmemiş veya geçersiz:', codPaymentType);
      return NextResponse.json(
        {
          error: 'Lütfen kapıda ödeme şeklinizi seçin (Nakit veya Kredi Kartı)',
          field: 'codPaymentType',
        },
        { status: 400, headers: corsHeaders }
      );
    }

    // Database'den shop bilgisini ve access token'ı al
    const shopRecord = await prisma.shop.findUnique({
      where: { shopDomain: shop },
    });

    if (!shopRecord || !shopRecord.accessToken) {
      console.error('❌ Shop bulunamadı veya access token yok:', shop);
      return NextResponse.json(
        {
          error: 'Mağaza yapılandırması bulunamadı',
          details: 'Lütfen uygulamayı yeniden yükleyin'
        },
        { status: 500, headers: corsHeaders }
      );
    }

    const accessToken = shopRecord.accessToken;
    console.log('✅ Access token bulundu, shop:', shop);

    // Direkt Order API kullanarak sipariş oluştur (draft yok!)
    const shopifyApiUrl = `https://${shop}/admin/api/2025-04/orders.json`;

    console.log('🔑 Access Token (ilk 20 karakter):', accessToken.substring(0, 20));
    console.log('📝 Direkt Order oluşturuluyor...');

    // Sipariş verilerini hazırla
    const lineItems = cartItems?.map((item: any) => ({
      variant_id: item.variant_id || item.id,
      quantity: item.quantity,
      price: (item.price / 100).toFixed(2), // cents to dollars
    })) || [];

    // Checkout token oluştur (Shopify tracking için kritik)
    const checkoutToken = cartToken || `cod_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Önce müşteriyi kontrol et veya oluştur
    let customerId = null;
    try {
      // Telefon numarasına göre müşteri ara
      const customerSearchUrl = `https://${shop}/admin/api/2025-04/customers/search.json?query=phone:${encodeURIComponent(customerPhone)}`;
      const customerSearchResponse = await fetch(customerSearchUrl, {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      });

      if (customerSearchResponse.ok) {
        const customerSearchData = await customerSearchResponse.json();
        if (customerSearchData.customers && customerSearchData.customers.length > 0) {
          // Müşteri bulundu, ID'sini kullan
          customerId = customerSearchData.customers[0].id;
          console.log('✅ Mevcut müşteri bulundu:', customerId);
        }
      }
    } catch (searchError) {
      console.log('⚠️ Müşteri arama hatası (devam ediliyor):', searchError);
    }

    // Eğer müşteri bulunamadıysa, yeni müşteri oluştur
    if (!customerId) {
      try {
        const customerCreateUrl = `https://${shop}/admin/api/2025-04/customers.json`;
        const customerData = {
          customer: {
            first_name: customerName.split(' ')[0] || customerName,
            last_name: customerName.split(' ').slice(1).join(' ') || '',
            email: customerEmail || `cod-${Date.now()}@shopify-cod.local`,
            phone: '+90'+customerPhone,
            verified_email: false,
            tags: '',
          },
        };

        const customerCreateResponse = await fetch(customerCreateUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify(customerData),
        });

        if (customerCreateResponse.ok) {
          const customerCreateData = await customerCreateResponse.json();
          customerId = customerCreateData.customer.id;
          console.log('✅ Yeni müşteri oluşturuldu:', customerId);
        } else {
          const customerError = await customerCreateResponse.json();
          console.log('⚠️ Müşteri oluşturma hatası (devam ediliyor):', customerError);
        }
      } catch (createError) {
        console.log('⚠️ Müşteri oluşturma hatası (devam ediliyor):', createError);
      }
    }

    const orderData = {
      order: {
        line_items: lineItems,
        ...(customerId ? { customer: { id: customerId } } : {
          customer: {
            first_name: customerName.split(' ')[0] || customerName,
            last_name: customerName.split(' ').slice(1).join(' ') || '',
            email: customerEmail || `cod-${Date.now()}@shopify-cod.local`,
          }
        }),
        shipping_address: {
          first_name: customerName.split(' ')[0] || customerName,
          last_name: customerName.split(' ').slice(1).join(' ') || '',
          address1: customerAddress,
          city: customerCity || '',
          province: customerCity || '',
          country: customerCountry || 'TR',
          zip: customerZip || '',
          phone: customerPhone,
        },
        billing_address: {
          first_name: customerName.split(' ')[0] || customerName,
          last_name: customerName.split(' ').slice(1).join(' ') || '',
          address1: customerAddress,
          city: customerCity || '',
          province: customerCity || '',
          country: customerCountry || 'TR',
          zip: customerZip || '',
          phone: customerPhone,
        },
        note: `Kapıda Ödeme (COD) - WhatsApp Doğrulamalı Sipariş
Ödeme Şekli: ${codPaymentType === 'card' ? 'Kapıda Kredi Kartı' : 'Kapıda Nakit'}
Checkout Token: ${checkoutToken}
Landing Page: ${landingPage || 'N/A'}
Referring Site: ${referringSite || 'Direct'}
Browser IP: ${clientIp || 'N/A'}
User Agent: ${userAgent || 'N/A'}`,
        tags: `COD, WhatsApp-Verified, ${codPaymentType === 'card' ? 'Kapıda-Kredi-Kartı' : 'Kapıda-Nakit'}`,
        // Shopify tracking için source bilgileri
        source_name: 'COD WhatsApp App',
        source_identifier: checkoutToken,
        source_url: landingPage || undefined,
        // Finansal durum - ödeme bekliyor
        financial_status: 'pending',
        // Sipariş durumu - ödeme bekliyor
        fulfillment_status: null,
        // COD için transactions ekle
        transactions: [
          {
            kind: 'sale',
            status: 'pending',
            amount: (cartItems?.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) || 0) / 100,
            gateway: 'Cash on Delivery',
          }
        ],
        // Inventory davranışı
        inventory_behaviour: 'decrement_ignoring_policy',
        // Email gönderme
        send_receipt: false,
        send_fulfillment_receipt: false,
      },
    };

    console.log('📤 Shopify Orders API\'ye gönderiliyor:', shopifyApiUrl);

    const orderResponse = await fetch(shopifyApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': accessToken,
      },
      body: JSON.stringify(orderData),
    });

    const orderResponseData = await orderResponse.json();

    if (!orderResponse.ok) {
      console.error('❌ Shopify Order hatası:', orderResponseData);
      return NextResponse.json(
        {
          error: 'Sipariş oluşturulamadı',
          details: orderResponseData.errors || orderResponseData,
        },
        { status: orderResponse.status, headers: corsHeaders }
      );
    }

    const finalOrder = orderResponseData.order;
    console.log('✅ Sipariş oluşturuldu:', finalOrder.id);
    console.log('📋 Order Name:', finalOrder.name);
    console.log('📋 Order Number:', finalOrder.order_number);

    // SHOPIFY MARKETING EVENTS API - CONVERSION TRACKING (KRİTİK!)
    if (finalOrder.id) {
      try {
        const marketingEventUrl = `https://${shop}/admin/api/2025-04/marketing_events.json`;

        const marketingEventData = {
          marketing_event: {
            remote_id: `cod_${finalOrder.id}_${Date.now()}`,
            event_type: 'ad', // 'sale' yerine 'post' veya 'ad' olmalı, event_type genelde action tipi
            marketing_channel: 'social',
            paid: false, // Budget zorunluysa paid true olmalı
            started_at: new Date().toISOString(),
            referring_domain: referringSite ? new URL(referringSite).hostname : shop,
            budget: "2.00",
            currency: 'TRY',
            budget_type: 'daily',
            utm_campaign: `cod_whatsapp_${finalOrder.id}`,
            utm_source: 'whatsapp',
            utm_medium: 'cod_app',
            description: 'COD WhatsApp Verified Order',
            manage_url: `https://${shop}/admin/orders/${finalOrder.id}`,
            preview_url: landingPage || `https://${shop}`,
            tactic: 'post' // Zorunlu alan
          }
        };

        const marketingResponse = await fetch(marketingEventUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify(marketingEventData),
        });

        if (marketingResponse.ok) {
          const marketingData = await marketingResponse.json();
          console.log('✅ Marketing Event oluşturuldu:', marketingData.marketing_event.id);

          // Marketing Event'e engagement ekle (conversion tracking için)
          const engagementUrl = `https://${shop}/admin/api/2025-04/marketing_events/${marketingData.marketing_event.id}/engagements.json`;

          const engagementData = {
            engagements: [
              {
                occurred_on: new Date().toISOString().split('T')[0], // YYYY-MM-DD formatında olmalı
                impressions_count: 1,
                views_count: 1,
                clicks_count: 1,
                shares_count: 0,
                favorites_count: 0,
                comments_count: 0,
                ad_spend: 0,
                is_cumulative: false,
                utc_offset: '+03:00'
              }
            ]
          };

          const engagementResponse = await fetch(engagementUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': accessToken,
            },
            body: JSON.stringify(engagementData),
          });

          if (engagementResponse.ok) {
            console.log('✅ Marketing Engagement kaydedildi (CONVERSION TRACKED!)');
          } else {
            const engagementError = await engagementResponse.json();
            console.error('⚠️ Marketing Engagement hatası:', engagementError);
          }
        } else {
          const marketingError = await marketingResponse.json();
          console.error('⚠️ Marketing Event hatası:', marketingError);
        }
      } catch (marketingError: any) {
        console.error('⚠️ Marketing API hatası:', marketingError.message);
        // Marketing hatası kritik değil, devam et
      }
    }

    // Shopify'a conversion tracking bilgilerini gönder (Order metafields ile)
    if (finalOrder.id) {
      try {
        const metafieldsUrl = `https://${shop}/admin/api/2025-04/orders/${finalOrder.id}/metafields.json`;

        // Tracking bilgilerini metafield olarak kaydet
        const trackingMetafields = [
          {
            namespace: 'cod_tracking',
            key: 'checkout_token',
            value: checkoutToken,
            type: 'single_line_text_field'
          },
          {
            namespace: 'cod_tracking',
            key: 'landing_page',
            value: landingPage || 'Direct',
            type: 'single_line_text_field'
          },
          {
            namespace: 'cod_tracking',
            key: 'referring_site',
            value: referringSite || 'Direct',
            type: 'single_line_text_field'
          },
          {
            namespace: 'cod_tracking',
            key: 'browser_ip',
            value: clientIp || 'Unknown',
            type: 'single_line_text_field'
          },
          {
            namespace: 'cod_tracking',
            key: 'conversion_source',
            value: 'COD WhatsApp App',
            type: 'single_line_text_field'
          }
        ];

        for (const metafield of trackingMetafields) {
          await fetch(metafieldsUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Access-Token': accessToken,
            },
            body: JSON.stringify({ metafield }),
          });
        }

        console.log('✅ Conversion tracking metafields kaydedildi');
      } catch (metaError: any) {
        console.error('⚠️ Metafield kayıt hatası:', metaError.message);
        // Metafield hatası kritik değil, devam et
      }
    }

    // Database'e siparişi kaydet
    try {
      await prisma.order.create({
        data: {
          shopId: shopRecord.id,
          orderId: finalOrder.id?.toString(),
          customerName,
          customerPhone,
          customerEmail: customerEmail || null,
          customerAddress,
          customerCity: customerCity || '',
          customerCountry: customerCountry || 'TR',
          customerZip: customerZip || null,
          whatsappVerified: false,
          paymentMethod: 'COD',
          orderStatus: 'pending',
          totalAmount: totalAmount ? totalAmount / 100 : 0,
        },
      });
      console.log('✅ Sipariş database\'e kaydedildi');
    } catch (dbError: any) {
      console.error('⚠️ Database kayıt hatası:', dbError.message);
      // Database hatası olsa bile Shopify siparişi oluşturuldu, devam et
    }

    // Shopify Thank You / Order Status URL'ini oluştur
    // Order oluşturulduğunda Shopify otomatik olarak order_status_url oluşturur
    let thankYouUrl = '';

    if (finalOrder.order_status_url) {
      // Shopify'ın resmi order status URL'i (en güvenilir)
      thankYouUrl = finalOrder.order_status_url;
      console.log('✅ Order Status URL (Shopify):', thankYouUrl);
    } else if (finalOrder.id) {
      // Fallback: Manuel olarak oluştur
      // Shopify'ın standart order confirmation URL formatı
      thankYouUrl = `https://${shop}/account/orders/${finalOrder.id}`;
      console.log('⚠️ Order Status URL (Manuel):', thankYouUrl);
    } else {
      // Son fallback: Ana sayfa
      thankYouUrl = `https://${shop}`;
      console.log('⚠️ Order Status URL bulunamadı, ana sayfaya yönlendiriliyor');
    }

    console.log('🎉 Final Thank You URL:', thankYouUrl);

    const response = {
      success: true,
      orderId: finalOrder.id,
      orderNumber: finalOrder.order_number,
      orderName: finalOrder.name,
      orderStatusUrl: thankYouUrl,
      thankYouUrl: thankYouUrl,
      checkoutToken: cartToken,
      shop,
      message: 'COD siparişi başarıyla oluşturuldu - Teşekkür sayfasına yönlendiriliyorsunuz',
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail || 'N/A',
        address: customerAddress,
        city: customerCity,
        country: customerCountry,
        zip: customerZip,
      },
      order: {
        items: cartItems?.length || 0,
        total: totalAmount,
        currency: 'TRY',
      },
      timestamp: new Date().toISOString(),
    };

    console.log('📤 Response:', response);

    // Meta CAPI - Purchase Event Gönder
    if (finalOrder.id) {
      try {
        console.log('📡 [COD API] Meta CAPI süreci başlatılıyor...');
        const { sendMetaPurchaseEvent } = await import('@/lib/meta-capi');

        await sendMetaPurchaseEvent(
          prisma,
          shop,
          finalOrder,
          {
            email: customerEmail,
            phone: customerPhone,
            firstName: customerName.split(' ')[0] || customerName,
            lastName: customerName.split(' ').slice(1).join(' ') || '',
            city: customerCity,
            country: customerCountry,
          },
          clientIp,
          userAgent
        );
      } catch (capiError) {
        console.error('⚠️ [COD API] Meta CAPI entegrasyon hatası:', capiError);
        // CAPI hatası sipariş sürecini bozmamalı
      }
    }

    return NextResponse.json(response, {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error: any) {
    console.error('❌ [COD API] HATA:', error);

    return NextResponse.json(
      {
        error: 'Sipariş oluşturulurken hata oluştu',
        details: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500, headers: corsHeaders }
    );
  } finally {
    await prisma.$disconnect();
  }
}