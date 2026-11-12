-- Agregar KITCHEN al enum user_roles
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('WAITER', 'CASHIER', 'ADMIN', 'SUPER_ADMIN', 'KITCHEN') NOT NULL;

-- Crear tabla kitchen_orders
CREATE TABLE `kitchen_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER NOT NULL,
    `status` ENUM('RECEIVED', 'PREPARING', 'READY') NOT NULL DEFAULT 'RECEIVED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Agregar FK y unicidad a kitchen_orders
ALTER TABLE `kitchen_orders` ADD CONSTRAINT `kitchen_orders_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX `kitchen_orders_order_id_key` ON `kitchen_orders`(`order_id`);
CREATE INDEX `kitchen_orders_status_idx` ON `kitchen_orders`(`status`);
