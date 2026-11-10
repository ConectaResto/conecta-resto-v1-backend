-- AlterTable
ALTER TABLE `tables` MODIFY COLUMN `qr_token` VARCHAR(255) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `tables_qr_token_key` ON `tables`(`qr_token`);
