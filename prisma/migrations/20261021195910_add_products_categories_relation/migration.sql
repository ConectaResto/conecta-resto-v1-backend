/*
  Warnings:

  - You are about to drop the column `category_id` on the `products` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `products` DROP FOREIGN KEY `products_category_id_fkey`;

-- DropIndex
DROP INDEX `products_category_id_idx` ON `products`;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `category_id`;

-- CreateTable
CREATE TABLE `products_categories` (
    `product_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,

    INDEX `products_categories_category_id_idx`(`category_id`),
    PRIMARY KEY (`product_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `products_categories` ADD CONSTRAINT `products_categories_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products_categories` ADD CONSTRAINT `products_categories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
