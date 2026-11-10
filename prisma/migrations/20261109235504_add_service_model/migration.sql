-- Crear tabla services
CREATE TABLE `services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `table_id` INTEGER NOT NULL,
    `restaurant_id` INTEGER NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Agregar FKs a services
ALTER TABLE `services` ADD CONSTRAINT `services_table_id_fkey` FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `services` ADD CONSTRAINT `services_restaurant_id_fkey` FOREIGN KEY (`restaurant_id`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Agregar índices
CREATE INDEX `services_table_id_idx` ON `services`(`table_id`);
CREATE INDEX `services_restaurant_id_idx` ON `services`(`restaurant_id`);
CREATE INDEX `services_status_idx` ON `services`(`status`);

-- Migrar ServiceRequest que tienen órdenes a Service (mantener el mismo ID)
INSERT INTO `services` (id, table_id, restaurant_id, status, created_at)
SELECT sr.id, sr.table_id, sr.restaurant_id, sr.status, sr.created_at
FROM `service_requests` sr
WHERE EXISTS (SELECT 1 FROM `orders` o WHERE o.service_id = sr.id);

-- Eliminar FK antigua de orders.service_id
ALTER TABLE `orders` DROP FOREIGN KEY `orders_service_id_fkey`;

-- Agregar nueva FK apuntando a services.id
ALTER TABLE `orders` ADD CONSTRAINT `orders_service_id_fkey` FOREIGN KEY (`service_id`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
