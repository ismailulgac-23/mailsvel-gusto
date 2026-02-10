import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getEnv } from "@/app/config";

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log("🔐 OAuth Callback başladı");

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const shop = searchParams.get("shop");
    const state = searchParams.get("state");

    if (!code || !shop) {
      throw new Error("Code veya shop parametresi eksik");
    }

    console.log("📍 Shop:", shop);
    console.log("🔑 Code alındı");

    // Access token al
    const accessTokenUrl = `https://${shop}/admin/oauth/access_token`;
    const accessTokenData = {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    };

    const tokenResponse = await fetch(accessTokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(accessTokenData),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      throw new Error("Access token alınamadı: " + JSON.stringify(tokenData));
    }

    const accessToken = tokenData.access_token;
    const scope = tokenData.scope;
    console.log("✅ Access Token alındı");

    // Session'ı veritabanına kaydet
    const sessionId = `offline_${shop}`;
    await prisma.session.upsert({
      where: { id: sessionId },
      update: {
        shop,
        state: state || "",
        isOnline: false,
        scope,
        accessToken,
      },
      create: {
        id: sessionId,
        shop,
        state: state || "",
        isOnline: false,
        scope,
        accessToken,
      },
    });

    console.log("✅ Session database'e kaydedildi");

    // Shop kaydını oluştur veya güncelle
    await prisma.shop.upsert({
      where: { shopDomain: shop },
      update: {
        accessToken,
        isActive: true,
      },
      create: {
        shopDomain: shop,
        accessToken,
        isActive: true,
        codEnabled: true,
        whatsappEnabled: true,
        popupTitle: "Kapıda Ödeme ile Sipariş Ver",
        popupDescription: "Kapıda ödeme ile güvenli alışveriş",
      },
    });

    console.log("✅ Shop database'e kaydedildi");

    await prisma.$disconnect();

    // Shopify Admin embedded app'e yönlendir
    const host = searchParams.get("host");

    console.log("🎉 OAuth tamamlandı, embedded app'e yönlendiriliyor...");
    console.log("📍 Shop:", shop);
    console.log("📍 Host:", host);

    // Shopify Admin embedded app URL'i
    const embeddedAppUrl = `https://${shop}/admin/apps/${process.env.SHOPIFY_API_KEY}`;

    // HTML ile Shopify Admin'e yönlendir
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Yetkilendirme Tamamlandı</title>
        </head>
        <body>
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;">
            <div style="text-align: center;">
              <div style="font-size: 48px; margin-bottom: 20px;">✅</div>
              <h2 style="color: #202223; margin-bottom: 10px;">Yetkilendirme Başarılı!</h2>
              <p style="color: #6d7175;">Uygulamaya yönlendiriliyorsunuz...</p>
            </div>
          </div>
          <script>
            // Shopify Admin embedded app'e yönlendir
            window.top.location.href = "${embeddedAppUrl}";
          </script>
        </body>
      </html>
    `;

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error: any) {
    console.error("❌ Callback error:", error);
    await prisma.$disconnect();
    return NextResponse.json(
      {
        error: "Authentication callback failed",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
