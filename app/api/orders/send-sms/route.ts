import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendSms } from '@/lib/sms';

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log('📱 [SMS API] SMS gönderme isteği alındı');

    const { phoneNumber, shop } = body;

    if (!phoneNumber || !shop) {
      return NextResponse.json(
        { error: 'Telefon numarası ve mağaza bilgisi gerekli' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Telefon numarasını temizle (sadece rakamlar)
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    // Türkiye telefon numarası kontrolü
    if (!cleanPhone.startsWith('90') && !cleanPhone.startsWith('5')) {
      return NextResponse.json(
        { error: 'Geçersiz telefon numarası formatı' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 4 haneli doğrulama kodu oluştur
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    
    // Kod geçerlilik süresi: 5 dakika
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Eski kodları sil veya güncelle
    await prisma.whatsappVerification.deleteMany({
      where: {
        phoneNumber: cleanPhone,
        verified: false,
      },
    });

    // Yeni doğrulama kaydı oluştur
    const verification = await prisma.whatsappVerification.create({
      data: {
        phoneNumber: cleanPhone,
        verificationCode,
        expiresAt,
        verified: false,
        attempts: 0,
      },
    });

    console.log('✅ Doğrulama kodu oluşturuldu:', verificationCode);

    // WhatsApp üzerinden SMS gönder
    const smsSent = await sendSms({ to: cleanPhone, code: verificationCode });

    if (!smsSent) {
      console.error('❌ SMS gönderilemedi');
      return NextResponse.json(
        {
          error: 'SMS gönderilemedi',
          details: 'WhatsApp servisi şu anda kullanılamıyor'
        },
        { status: 500, headers: corsHeaders }
      );
    }

    console.log('✅ SMS başarıyla gönderildi');

    return NextResponse.json(
      {
        success: true,
        message: 'Doğrulama kodu WhatsApp üzerinden gönderildi',
        expiresIn: 300, // 5 dakika (saniye cinsinden)
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ [SMS API] Hata:', error);
    return NextResponse.json(
      {
        error: 'SMS gönderilirken hata oluştu',
        details: error?.message || 'Bilinmeyen hata',
      },
      { status: 500, headers: corsHeaders }
    );
  } finally {
    await prisma.$disconnect();
  }
}
