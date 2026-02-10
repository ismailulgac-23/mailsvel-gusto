import { NextRequest, NextResponse } from 'next/server';

/**
 * Meta OAuth başlatma endpoint'i
 * Kullanıcıyı Meta (Facebook) OAuth ekranına yönlendirir
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

        const metaAppId = process.env.META_APP_ID;
        const redirectUri = process.env.META_REDIRECT_URI;

        if (!metaAppId || !redirectUri) {
            return NextResponse.json(
                { error: 'Meta OAuth ayarları yapılandırılmamış' },
                { status: 500 }
            );
        }

        // State parametresi - CSRF koruması için
        const state = Buffer.from(JSON.stringify({ shopId, timestamp: Date.now() })).toString('base64');

        // Meta OAuth URL oluştur
        const scopes = [
            'business_management',
            'ads_management',
            'ads_read',
        ].join(',');

        const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
        authUrl.searchParams.set('client_id', metaAppId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('scope', scopes);
        authUrl.searchParams.set('response_type', 'code');

        return NextResponse.redirect(authUrl.toString());
    } catch (error) {
        console.error('Meta OAuth başlatma hatası:', error);
        return NextResponse.json(
            { error: 'Meta OAuth başlatılamadı' },
            { status: 500 }
        );
    }
}
