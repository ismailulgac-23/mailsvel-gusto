const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const shop = await prisma.shop.upsert({
    where: { shopDomain: 'nexora-cod-test.myshopify.com' },
    update: {},
    create: {
      shopDomain: 'nexora-cod-test.myshopify.com',
      accessToken: process.env.SHOPIFY_ACCESS_TOKEN || 'TEMP_TOKEN',
      isActive: true,
      codEnabled: true,
      whatsappEnabled: true,
      popupTitle: 'Kapıda Ödeme ile Sipariş Ver',
      popupDescription: 'Kapıda ödeme ile güvenli alışveriş',
    },
  });

  console.log('✅ Shop kaydı oluşturuldu:', shop);
}

main()
  .catch((e) => {
    console.error('❌ Hata:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
