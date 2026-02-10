-- CreateTable
CREATE TABLE "MetaIntegration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shopId" TEXT NOT NULL,
    "metaBusinessAccountId" TEXT NOT NULL,
    "metaAccessToken" TEXT NOT NULL,
    "metaTokenExpiry" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MetaIntegration_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MetaPixel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "metaIntegrationId" TEXT NOT NULL,
    "pixelId" TEXT NOT NULL,
    "pixelName" TEXT NOT NULL,
    "capiAccessToken" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MetaPixel_metaIntegrationId_fkey" FOREIGN KEY ("metaIntegrationId") REFERENCES "MetaIntegration" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MetaIntegration_shopId_key" ON "MetaIntegration"("shopId");

-- CreateIndex
CREATE UNIQUE INDEX "MetaPixel_metaIntegrationId_pixelId_key" ON "MetaPixel"("metaIntegrationId", "pixelId");
