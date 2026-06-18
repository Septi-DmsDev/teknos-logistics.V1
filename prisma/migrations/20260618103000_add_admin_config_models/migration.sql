-- CreateEnum
CREATE TYPE "CourierServiceStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Origin" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "storeId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "postalCode" TEXT,
    "phone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Origin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierService" (
    "id" TEXT NOT NULL,
    "courier" "CourierCode" NOT NULL,
    "serviceCode" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "status" "CourierServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantCourierService" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "courierServiceId" TEXT NOT NULL,
    "originId" TEXT,
    "status" "CourierServiceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantCourierService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_merchantId_slug_key" ON "Store"("merchantId", "slug");

-- CreateIndex
CREATE INDEX "Store_merchantId_isActive_idx" ON "Store"("merchantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Origin_merchantId_code_key" ON "Origin"("merchantId", "code");

-- CreateIndex
CREATE INDEX "Origin_merchantId_isActive_idx" ON "Origin"("merchantId", "isActive");

-- CreateIndex
CREATE INDEX "Origin_storeId_isActive_idx" ON "Origin"("storeId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CourierService_courier_serviceCode_key" ON "CourierService"("courier", "serviceCode");

-- CreateIndex
CREATE INDEX "CourierService_courier_status_idx" ON "CourierService"("courier", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantCourierService_merchantId_courierServiceId_originId_key" ON "MerchantCourierService"("merchantId", "courierServiceId", "originId");

-- CreateIndex
CREATE INDEX "MerchantCourierService_merchantId_status_idx" ON "MerchantCourierService"("merchantId", "status");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Origin" ADD CONSTRAINT "Origin_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Origin" ADD CONSTRAINT "Origin_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantCourierService" ADD CONSTRAINT "MerchantCourierService_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantCourierService" ADD CONSTRAINT "MerchantCourierService_courierServiceId_fkey" FOREIGN KEY ("courierServiceId") REFERENCES "CourierService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantCourierService" ADD CONSTRAINT "MerchantCourierService_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Origin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
