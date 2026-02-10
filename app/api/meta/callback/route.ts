import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Next.js'e bu route'un dinamik olduğunu belirt
export const dynamic = 'force-dynamic';

/**
 * Helper: Popup penceresi için HTML response oluştur
 */
function createPopupResponse(success: boolean, message: string, shopId?: string) {
  const bgColor = success
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
  const icon = success ? '✓' : '✗';
  const title = success ? 'Meta Hesabı Bağlandı!' : 'Bağlantı Başarısız';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: ${bgColor};
            color: white;
          }
          .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
            max-width: 400px;
          }
          .icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          h1 {
            margin: 0 0 10px 0;
            font-size: 24px;
          }
          p {
            margin: 0;
            opacity: 0.9;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">${icon}</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <p style="margin-top: 10px;">Bu pencere otomatik olarak kapanacak...</p>
        </div>
        <script>
          // Ana pencereye mesaj gönder
          if (window.opener) {
            window.opener.postMessage({
              type: '${success ? 'META_OAUTH_SUCCESS' : 'META_OAUTH_ERROR'}',
              message: '${message}',
              ${shopId ? `shopId: '${shopId}'` : ''}
            }, window.location.origin);
            
            // 2 saniye sonra pencereyi kapat
            setTimeout(() => {
              window.close();
            }, 2000);
          } else {
            // Fallback: Eğer opener yoksa ana sayfaya yönlendir
            setTimeout(() => {
              window.location.href = '/?meta_error=' + encodeURIComponent('${message}');
            }, 2000);
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
}

/**
 * Meta OAuth callback endpoint'i
 * Facebook'tan dönen authorization code'u access token'a çevirir
 * ve veritabanına kaydeder
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // OAuth hata kontrolü
    if (error) {
      console.error('Meta OAuth hatası:', error);
      return createPopupResponse(
        false,
        'Meta OAuth yetkilendirmesi iptal edildi veya başarısız oldu.'
      );
    }


    if (!code || !state) {
      return createPopupResponse(
        false,
        'Geçersiz OAuth callback parametreleri.'
      );
    }


    // State'i decode et
    const decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
    const { shopId } = decodedState;

    if (!shopId) {
      return createPopupResponse(
        false,
        'Geçersiz state parametresi. Lütfen tekrar deneyin.'
      );
    }


    // Access token al
    const tokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', process.env.META_APP_ID!);
    tokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!);
    tokenUrl.searchParams.set('redirect_uri', process.env.META_REDIRECT_URI!);
    tokenUrl.searchParams.set('code', code);

    const tokenResponse = await fetch(tokenUrl.toString());
    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Token alma hatası:', tokenData);
      return createPopupResponse(
        false,
        'Meta access token alınamadı. Lütfen tekrar deneyin.'
      );
    }


    const { access_token, expires_in } = tokenData;

    // Long-lived token al
    const longLivedTokenUrl = new URL('https://graph.facebook.com/v18.0/oauth/access_token');
    longLivedTokenUrl.searchParams.set('grant_type', 'fb_exchange_token');
    longLivedTokenUrl.searchParams.set('client_id', process.env.META_APP_ID!);
    longLivedTokenUrl.searchParams.set('client_secret', process.env.META_APP_SECRET!);
    longLivedTokenUrl.searchParams.set('fb_exchange_token', access_token);

    const longLivedResponse = await fetch(longLivedTokenUrl.toString());
    const longLivedData = await longLivedResponse.json();

    const finalToken = longLivedData.access_token || access_token;
    const tokenExpiry = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : null;

    // Veritabanına kaydet veya güncelle
    await prisma.metaIntegration.upsert({
      where: { shopId },
      create: {
        shopId,
        metaAccessToken: finalToken,
        metaTokenExpiry: tokenExpiry,
        isActive: true,
      },
      update: {
        metaAccessToken: finalToken,
        metaTokenExpiry: tokenExpiry,
        isActive: true,
        updatedAt: new Date(),
      },
    });


    // Başarılı - Popup penceresinde ana pencereye mesaj gönder ve kapat
    return createPopupResponse(
      true,
      'Meta hesabınız başarıyla bağlandı. Şimdi yönetilecek hesabı seçebilirsiniz.',
      shopId
    );

  } catch (error: any) {
    console.error('Meta OAuth callback hatası:', error);
    return createPopupResponse(
      false,
      'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' + error.toString()
    );

  } finally {
    await prisma.$disconnect();
  }
}
