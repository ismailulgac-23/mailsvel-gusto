import { NextRequest, NextResponse } from 'next/server';

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
    const orderData = await request.json();

    console.log('🧪 TEST - Sipariş verisi alındı:', {
      shop: orderData.shop,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      itemCount: orderData.cartItems?.length,
      totalAmount: orderData.totalAmount
    });

    // Test için başarılı response döndür
    const testOrderNumber = `TEST-${Date.now()}`;
    
    return NextResponse.json({
      success: true,
      orderId: testOrderNumber,
      orderNumber: testOrderNumber,
      message: 'TEST MODU - Sipariş simüle edildi',
      receivedData: {
        customerName: orderData.customerName,
        customerPhone: orderData.customerPhone,
        customerEmail: orderData.customerEmail,
        customerAddress: orderData.customerAddress,
        customerCity: orderData.customerCity,
        customerCountry: orderData.customerCountry,
        customerZip: orderData.customerZip,
        itemCount: orderData.cartItems?.length || 0,
        totalAmount: orderData.totalAmount
      }
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error('❌ Test endpoint hatası:', error);
    return NextResponse.json({
      error: 'Test endpoint hatası',
      details: error.message,
    }, { status: 500, headers: corsHeaders });
  }
}