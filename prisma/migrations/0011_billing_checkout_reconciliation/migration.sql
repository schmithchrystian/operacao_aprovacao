ALTER TABLE "BillingCheckout" ADD COLUMN "reconciledAt" TIMESTAMP(3);
CREATE INDEX "BillingCheckout_reconciledAt_idx" ON "BillingCheckout"("reconciledAt");
