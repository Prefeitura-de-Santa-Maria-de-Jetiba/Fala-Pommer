-- AlterTable
ALTER TABLE `comunidade`
    ADD COLUMN `comunidade_criada_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `comunidade_criador_id` INTEGER NULL,
    ADD INDEX `comunidade_criador_id`(`comunidade_criador_id`);

-- CreateTable
CREATE TABLE `convite_comunidade` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(64) NOT NULL,
    `comunidade_id` INTEGER NOT NULL,
    `criado_por` INTEGER NOT NULL,
    `expira_em` DATETIME(0) NOT NULL,
    `usado` BOOLEAN NOT NULL DEFAULT false,
    `criado_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_convite_token`(`token`),
    INDEX `idx_convite_comunidade`(`comunidade_id`),
    INDEX `idx_convite_criador`(`criado_por`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comunidade_usuarios` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `comunidade_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `tipo_funcao` ENUM('seguidor', 'membro', 'admin') NOT NULL DEFAULT 'membro',

    INDEX `fk_cu_usuario`(`usuario_id`),
    UNIQUE INDEX `uq_comunidade_usuario`(`comunidade_id`, `usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `promocoes_comunidades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `promovido_por` INTEGER NOT NULL,
    `pessoa_promovida` INTEGER NOT NULL,
    `comunidade_id` INTEGER NOT NULL,
    `promovido_em` DATETIME(0) NOT NULL,

    INDEX `fk_prom_com_comunidade`(`comunidade_id`),
    INDEX `fk_prom_com_pessoa_promovida`(`pessoa_promovida`),
    INDEX `fk_prom_com_promovido_por`(`promovido_por`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rebaixamentos_comunidades` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rebaixado_por` INTEGER NOT NULL,
    `pessoa_rebaixada` INTEGER NOT NULL,
    `comunidade_id` INTEGER NOT NULL,
    `rebaixada_em` DATETIME(0) NOT NULL,

    INDEX `fk_rc_comunidade_id`(`comunidade_id`),
    INDEX `fk_rc_pessoa_rebaixada`(`pessoa_rebaixada`),
    INDEX `fk_rc_rebaixado_por`(`rebaixado_por`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `comunidade` ADD CONSTRAINT `fk_comunidade_criador` FOREIGN KEY (`comunidade_criador_id`) REFERENCES `cadastro`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `convite_comunidade` ADD CONSTRAINT `fk_convite_comunidade` FOREIGN KEY (`comunidade_id`) REFERENCES `comunidade`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `convite_comunidade` ADD CONSTRAINT `fk_convite_criador` FOREIGN KEY (`criado_por`) REFERENCES `cadastro`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `comunidade_usuarios` ADD CONSTRAINT `fk_cu_comunidade` FOREIGN KEY (`comunidade_id`) REFERENCES `comunidade`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `comunidade_usuarios` ADD CONSTRAINT `fk_cu_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `cadastro`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `promocoes_comunidades` ADD CONSTRAINT `fk_prom_com_comunidade` FOREIGN KEY (`comunidade_id`) REFERENCES `comunidade`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `promocoes_comunidades` ADD CONSTRAINT `fk_prom_com_pessoa_promovida` FOREIGN KEY (`pessoa_promovida`) REFERENCES `cadastro`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `promocoes_comunidades` ADD CONSTRAINT `fk_prom_com_promovido_por` FOREIGN KEY (`promovido_por`) REFERENCES `cadastro`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `rebaixamentos_comunidades` ADD CONSTRAINT `fk_rc_comunidade_id` FOREIGN KEY (`comunidade_id`) REFERENCES `comunidade`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `rebaixamentos_comunidades` ADD CONSTRAINT `fk_rc_pessoa_rebaixada` FOREIGN KEY (`pessoa_rebaixada`) REFERENCES `cadastro`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `rebaixamentos_comunidades` ADD CONSTRAINT `fk_rc_rebaixado_por` FOREIGN KEY (`rebaixado_por`) REFERENCES `cadastro`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;