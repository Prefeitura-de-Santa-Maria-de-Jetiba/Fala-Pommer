-- CreateTable
CREATE TABLE `cadastro` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `nome` VARCHAR(150) NOT NULL,
    `data_nascimento` DATE NOT NULL,
    `cpf` VARCHAR(20) NOT NULL,
    `telefone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(150) NOT NULL,
    `senha` VARCHAR(255) NOT NULL,
    `token_recuperacao` VARCHAR(64) NULL,
    `token_recuperacao_expira_em` DATETIME(3) NULL,
    `tipo_usuario` ENUM('user', 'admin', 'funcionario') NOT NULL DEFAULT 'user',
    `setor_id` INTEGER NULL,

    INDEX `fk_cadastro_setor`(`setor_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `login_evento` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `criado_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `saiu_em` DATETIME(0) NULL,

    INDEX `fk_login_evento_usuario`(`usuario_id`),
    INDEX `idx_login_evento_criado_em`(`criado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tipo` ENUM('privada', 'grupo') NOT NULL DEFAULT 'privada',
    `criada_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversa_participante` (
    `conversa_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `entrou_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_participante_usuario`(`usuario_id`),
    PRIMARY KEY (`conversa_id`, `usuario_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `setores` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `setor` VARCHAR(150) NOT NULL,
    `sigla_setor` VARCHAR(20) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `cadastro` ADD CONSTRAINT `fk_cadastro_setor` FOREIGN KEY (`setor_id`) REFERENCES `setores`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `login_evento` ADD CONSTRAINT `fk_login_evento_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `cadastro`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `conversa_participante` ADD CONSTRAINT `fk_participante_conversa` FOREIGN KEY (`conversa_id`) REFERENCES `conversa`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `conversa_participante` ADD CONSTRAINT `fk_participante_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `cadastro`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
