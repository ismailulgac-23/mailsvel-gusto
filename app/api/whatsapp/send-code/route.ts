import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { sendSms } from '@/lib/sms';

const prisma = new PrismaClient();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json();

    console.log('📱 [SEND CODE] İstek alındı:', phoneNumber);

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Telefon numarası gerekli' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Telefon numarasını temizle
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // 6 haneli doğrulama kodu oluştur
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 dakika

    // Veritabanına kaydet
    await prisma.whatsappVerification.create({
      data: {
        phoneNumber: cleanPhone,
        verificationCode,
        expiresAt,
        verified: false,
        attempts: 0,
      },
    });

    console.log('✅ Kod veritabanına kaydedildi:', cleanPhone);

    // SMS ile kod gönder
    const smsSent = await sendSms({
      to: cleanPhone,
      code: verificationCode,
    });

    if (!smsSent) {
      console.error('❌ SMS gönderilemedi');
      return NextResponse.json({
        success: false,
        error: 'SMS gönderilemedi. Lütfen tekrar deneyin.'
      }, { status: 500, headers: corsHeaders });
    }

    console.log('✅ SMS başarıyla gönderildi');

    return NextResponse.json({
      success: true,
      message: 'Doğrulama kodu SMS ile gönderildi',
      expiresAt: expiresAt.toISOString()
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('❌ [SEND CODE] Hata:', error);
    return NextResponse.json(
      { error: 'Kod gönderilirken hata oluştu', details: error?.message },
      { status: 500, headers: corsHeaders }
    );
  } finally {
    await prisma.$disconnect();
  }
}