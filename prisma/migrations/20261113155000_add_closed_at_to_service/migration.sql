-- Agregar closedAt al modelo Service
ALTER TABLE `services` ADD COLUMN `closed_at` DATETIME(3) NULL;
