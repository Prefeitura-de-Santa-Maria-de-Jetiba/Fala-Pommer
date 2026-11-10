-- AlterTable
ALTER TABLE `conversa` MODIFY `tipo` ENUM('privada', 'grupo', 'setor') NOT NULL DEFAULT 'privada';

-- CreateTable
CREATE TABLE `conversa_setor` (
    `conversa_id` INTEGER NOT NULL,
    `setor_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `criada_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_conversa_setor_usuario`(`usuario_id`),
    UNIQUE INDEX `uq_conversa_setor_usuario`(`setor_id`, `usuario_id`),
    PRIMARY KEY (`conversa_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mensagem` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversa_id` INTEGER NOT NULL,
    `remetente_id` INTEGER NOT NULL,
    `origem` ENUM('usuario', 'setor') NOT NULL,
    `conteudo` TEXT NOT NULL,
    `enviada_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_mensagem_conversa_data`(`conversa_id`, `enviada_em`),
    INDEX `idx_mensagem_remetente`(`remetente_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `conversa_setor` ADD CONSTRAINT `fk_conversa_setor_conversa` FOREIGN KEY (`conversa_id`) REFERENCES `conversa`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `conversa_setor` ADD CONSTRAINT `fk_conversa_setor_setor` FOREIGN KEY (`setor_id`) REFERENCES `setores`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `conversa_setor` ADD CONSTRAINT `fk_conversa_setor_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `cadastro`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `mensagem` ADD CONSTRAINT `fk_mensagem_conversa` FOREIGN KEY (`conversa_id`) REFERENCES `conversa`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `mensagem` ADD CONSTRAINT `fk_mensagem_remetente` FOREIGN KEY (`remetente_id`) REFERENCES `cadastro`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
