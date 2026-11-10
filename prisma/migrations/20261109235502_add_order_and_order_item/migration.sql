-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `service_id` INTEGER NOT NULL,
    `restaurant_id` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'AUTHORIZED') NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `authorized_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `product_id` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `price` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `service_requests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX `orders_service_id_idx` ON `orders`(`service_id`);

-- CreateIndex
CREATE INDEX `orders_restaurant_id_idx` ON `orders`(`restaurant_id`);

-- CreateIndex
CREATE INDEX `orders_status_idx` ON `orders`(`status`);

-- CreateIndex
CREATE INDEX `order_items_order_id_idx` ON `order_items`(`order_id`);

-- CreateIndex
CREATE INDEX `order_items_product_id_idx` ON `order_items`(`product_id`);
