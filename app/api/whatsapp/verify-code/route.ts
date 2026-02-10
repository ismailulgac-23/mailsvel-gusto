import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS request için preflight handler
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, code } = await request.json();

    console.log('🔐 [VERIFY API] Doğrulama isteği:', { phoneNumber, code });

    if (!phoneNumber || !code) {
      return NextResponse.json({
        error: 'Telefon numarası ve kod gerekli',
        verified: false
      }, { status: 400, headers: corsHeaders });
    }

    // Telefon numarasını temizle
    const cleanPhone = phoneNumber.replace(/\D/g, '');

    // Veritabanından doğrulama kaydını bul
    const verification = await prisma.whatsappVerification.findFirst({
      where: {
        phoneNumber: cleanPhone,
        verified: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!verification) {
      console.log('❌ Doğrulama kaydı bulunamadı');
      return NextResponse.json({
        error: 'Bu telefon numarası için kod bulunamadı',
        verified: false
      }, { status: 400, headers: corsHeaders });
    }

    // Süre kontrolü
    if (verification.expiresAt < new Date()) {
      console.log('❌ Kod süresi dolmuş');
      await prisma.whatsappVerification.delete({
        where: { id: verification.id },
      });
      return NextResponse.json({
        error: 'Kod süresi dolmuş. Lütfen yeni kod isteyin',
        verified: false
      }, { status: 400, headers: corsHeaders });
    }

    // Deneme sayısı kontrolü
    if (verification.attempts >= 3) {
      console.log('❌ Çok fazla hatalı deneme');
      await prisma.whatsappVerification.delete({
        where: { id: verification.id },
      });
      return NextResponse.json({
        error: 'Çok fazla hatalı deneme. Lütfen yeni kod isteyin',
        verified: false
      }, { status: 400, headers: corsHeaders });
    }

    // Kod kontrolü
    if (verification.verificationCode !== code) {
      console.log('❌ Hatalı kod');
      await prisma.whatsappVerification.update({
        where: { id: verification.id },
        data: { attempts: verification.attempts + 1 },
      });
      
      return NextResponse.json({
        error: `Hatalı kod. Kalan deneme: ${3 - (verification.attempts + 1)}`,
        verified: false
      }, { status: 400, headers: corsHeaders });
    }

    // Başarılı doğrulama
    console.log('✅ Kod doğrulandı');
    await prisma.whatsappVerification.update({
      where: { id: verification.id },
      data: { verified: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Telefon numarası başarıyla doğrulandı',
      verified: true,
      phoneNumber: cleanPhone
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('❌ [VERIFY API] Hata:', error);
    return NextResponse.json({
      error: 'Kod doğrulanırken hata oluştu',
      details: error?.message || 'Bilinmeyen hata'
    }, { status: 500, headers: corsHeaders });
  } finally {
    await prisma.$disconnect();
  }
}