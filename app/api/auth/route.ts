import { getEnv } from '@/app/config';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const shop = request.nextUrl.searchParams.get('shop');

  if (!shop) {
    return NextResponse.json({ error: 'Shop parameter is required' }, { status: 400 });
  }

  try {
    const apiKey = process.env.SHOPIFY_API_KEY;
    const scopes = process.env.SHOPIFY_SCOPES || 'read_orders,write_orders';
    const redirectUri = `${process.env.SHOPIFY_APP_URL}/api/auth/callback`;
    
    // Shopify OAuth URL'i
    const authUrl = `https://${shop}/admin/oauth/authorize?` +
      `client_id=${apiKey}&` +
      `scope=${scopes}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `state=${Date.now()}&` +
      `grant_options[]=`;

    console.log('🔐 OAuth başlatılıyor:', shop);
    console.log('📍 Redirect URI:', redirectUri);
    console.log('🔗 Auth URL:', authUrl);

    // HTML ile client-side redirect (Shopify embedded app için gerekli)
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Yetkilendiriliyor...</title>
          <script src="https://cdn.shopify.com/shopifycloud/app-bridge.js"></script>
        </head>
        <body>
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 20px;">🔐</div>
              <h2 style="color: #202223; margin-bottom: 10px;">Shopify ile Yetkilendiriliyor...</h2>
              <p style="color: #6d7175;">Lütfen bekleyin, yönlendiriliyorsunuz.</p>
            </div>
          </div>
          <script>
            // Shopify embedded app için top-level redirect
            if (window.top === window.self) {
              // Standalone mode - direkt yönlendir
              window.location.href = "${authUrl}";
            } else {
              // Embedded mode - parent window'u yönlendir
              window.top.location.href = "${authUrl}";
            }
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error: any) {
    console.error('❌ Auth error:', error);
    return NextResponse.json({
      error: 'Authentication failed',
      details: error.message
    }, { status: 500 });
  }
}