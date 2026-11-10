-- AlterTable
ALTER TABLE `tables` ADD COLUMN `qr_token` VARCHAR(255) NULL;

-- CreateTable
CREATE TABLE `service_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `table_id` INTEGER NOT NULL,
    `restaurant_id` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'CLOSED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `closed_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `service_requests` ADD CONSTRAINT `service_requests_table_id_fkey` FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `service_requests` ADD CONSTRAINT `service_requests_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX `service_requests_table_id_idx` ON `service_requests`(`table_id`);

-- CreateIndex
CREATE INDEX `service_requests_restaurant_id_idx` ON `service_requests`(`restaurant_id`);

-- CreateIndex
CREATE INDEX `service_requests_status_idx` ON `service_requests`(`status`);
