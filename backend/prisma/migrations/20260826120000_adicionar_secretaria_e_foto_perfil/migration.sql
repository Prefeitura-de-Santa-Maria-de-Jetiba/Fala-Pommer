ALTER TABLE `cadastro`
    ADD COLUMN `foto_perfil_url` VARCHAR(500) NULL;

CREATE TABLE `secretaria` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `secretaria` VARCHAR(150) NOT NULL,
    `sigla_secretaria` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;