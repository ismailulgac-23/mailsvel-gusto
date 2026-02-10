import axios from "axios";

export const sendSms = async ({ to, code }: { to: string; code: string }) => {
  const message = `Sipariş doğrulama kodunuz: ${code}\n\nBu kodu kimseyle paylaşmayın. Kod 5 dakika geçerlidir.`;
  
  try {
    // Telefon numarasını temizle
    const cleanPhone = to.replace(/\D/g, '');
    
    // Türkiye kodu ekle (eğer yoksa)
    const phoneWithCountryCode = cleanPhone.startsWith('90')
      ? `+${cleanPhone}`
      : `+90${cleanPhone}`;

    console.log('📱 SMS gönderiliyor:', phoneWithCountryCode);


    const { data } = await axios.post(
      "https://api.vatansms.net/api/whatsapp/v1/messages/send",
      {
        reg_id: process.env.VATANSMS_DEVICE_ID,
        to: phoneWithCountryCode,
        message: message,
        send_speed: process.env.VATANSMS_SEND_SPEED || "2",
      },
      {
        headers: {
          "client-id": process.env.VATANSMS_CLIENT_ID,
          "client-secret": process.env.VATANSMS_SECRET_ID
        },
        timeout: 60000,
      }
    );

    console.log('📱 SMS API yanıtı:', data);

    if (data.code == 200) {
      console.log('✅ SMS başarıyla gönderildi');
      return true;
    } else {
      console.error('❌ SMS gönderilemedi:', data);
      return false;
    }
  } catch (error: any) {
    console.error('❌ SMS gönderme hatası:', error.message);
    return false;
  }
};
