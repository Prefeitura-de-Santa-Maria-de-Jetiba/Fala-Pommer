-- AlterTable
ALTER TABLE `comunidade` ADD COLUMN `categorias` ENUM('geral', 'saude', 'lazer', 'esportes', 'educacao', 'meio_ambiente', 'seguranca', 'obras') NOT NULL;