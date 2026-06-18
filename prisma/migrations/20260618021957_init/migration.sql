-- CreateEnum
CREATE TYPE "CourierCode" AS ENUM ('JNE', 'JNT', 'SAP_EXPRESS', 'MOCK');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'RETURNED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "WebhookRelayStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "label" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "externalOrderId" TEXT NOT NULL,
    "courier" "CourierCode" NOT NULL,
    "courierOrderId" TEXT,
    "waybillId" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
    "serviceCode" TEXT NOT NULL,
    "serviceName" TEXT,
    "originCode" TEXT NOT NULL,
    "destCode" TEXT NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "rateIdr" INTEGER,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT NOT NULL,
    "recipientAddress" TEXT NOT NULL,
    "bookedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentTracking" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "status" "ShipmentStatus" NOT NULL,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT,
    "courier" "CourierCode" NOT NULL,
    "eventType" TEXT NOT NULL,
    "rawPayload" JSONB NOT NULL,
    "normalized" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantWebhookEndpoint" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantWebhookEndpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookRelayAttempt" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "endpointId" TEXT NOT NULL,
    "status" "WebhookRelayStatus" NOT NULL DEFAULT 'PENDING',
    "httpStatus" INTEGER,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookRelayAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateCache" (
    "id" TEXT NOT NULL,
    "courier" "CourierCode" NOT NULL,
    "originCode" TEXT NOT NULL,
    "destCode" TEXT NOT NULL,
    "weightGrams" INTEGER NOT NULL,
    "rates" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Merchant_slug_key" ON "Merchant"("slug");

-- CreateIndex
CREATE INDEX "Merchant_isActive_createdAt_idx" ON "Merchant"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_merchantId_isActive_idx" ON "ApiKey"("merchantId", "isActive");

-- CreateIndex
CREATE INDEX "ApiKey_keyPrefix_idx" ON "ApiKey"("keyPrefix");

-- CreateIndex
CREATE INDEX "Shipment_merchantId_status_createdAt_idx" ON "Shipment"("merchantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Shipment_courier_waybillId_idx" ON "Shipment"("courier", "waybillId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_merchantId_externalOrderId_key" ON "Shipment"("merchantId", "externalOrderId");

-- CreateIndex
CREATE INDEX "ShipmentTracking_shipmentId_occurredAt_idx" ON "ShipmentTracking"("shipmentId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShipmentTracking_shipmentId_status_occurredAt_description_key" ON "ShipmentTracking"("shipmentId", "status", "occurredAt", "description");

-- CreateIndex
CREATE INDEX "WebhookEvent_courier_receivedAt_idx" ON "WebhookEvent"("courier", "receivedAt");

-- CreateIndex
CREATE INDEX "WebhookEvent_shipmentId_idx" ON "WebhookEvent"("shipmentId");

-- CreateIndex
CREATE INDEX "MerchantWebhookEndpoint_merchantId_isActive_idx" ON "MerchantWebhookEndpoint"("merchantId", "isActive");

-- CreateIndex
CREATE INDEX "WebhookRelayAttempt_status_nextRetryAt_idx" ON "WebhookRelayAttempt"("status", "nextRetryAt");

-- CreateIndex
CREATE INDEX "WebhookRelayAttempt_eventId_idx" ON "WebhookRelayAttempt"("eventId");

-- CreateIndex
CREATE INDEX "RateCache_expiresAt_idx" ON "RateCache"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateCache_courier_originCode_destCode_weightGrams_key" ON "RateCache"("courier", "originCode", "destCode", "weightGrams");

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentTracking" ADD CONSTRAINT "ShipmentTracking_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantWebhookEndpoint" ADD CONSTRAINT "MerchantWebhookEndpoint_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookRelayAttempt" ADD CONSTRAINT "WebhookRelayAttempt_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "WebhookEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookRelayAttempt" ADD CONSTRAINT "WebhookRelayAttempt_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "MerchantWebhookEndpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
