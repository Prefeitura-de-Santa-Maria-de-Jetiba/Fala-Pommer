-- CreateTable
CREATE TABLE `comunidade` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome_comunidade` VARCHAR(150) NOT NULL,
    `descricao_comunidade` VARCHAR(400) NOT NULL,
    `imagem_comunidade` VARCHAR(500) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
