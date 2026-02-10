const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.order.deleteMany();
  await prisma.whatsappVerification.deleteMany();
  await prisma.session.deleteMany();
  await prisma.metaIntegration.deleteMany();
  await prisma.metaPixel.deleteMany();
  await prisma.shop.deleteMany();
}

main()
  .catch((e) => {
    console.error("❌ Hata:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
