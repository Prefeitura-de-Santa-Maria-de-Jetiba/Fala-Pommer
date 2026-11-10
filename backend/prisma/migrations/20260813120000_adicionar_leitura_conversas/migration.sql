-- CreateTable
CREATE TABLE `conversa_leitura` (
    `conversa_id` INTEGER NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `ultima_mensagem_lida_id` INTEGER NULL,
    `lida_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_conversa_leitura_ultima_mensagem`(`ultima_mensagem_lida_id`),
    INDEX `idx_conversa_leitura_usuario`(`usuario_id`),
    PRIMARY KEY (`conversa_id`, `usuario_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_mensagem_conversa_id` ON `mensagem`(`conversa_id`, `id`);

-- AddForeignKey
ALTER TABLE `conversa_leitura` ADD CONSTRAINT `fk_conversa_leitura_conversa` FOREIGN KEY (`conversa_id`) REFERENCES `conversa`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `conversa_leitura` ADD CONSTRAINT `fk_conversa_leitura_ultima_mensagem` FOREIGN KEY (`ultima_mensagem_lida_id`) REFERENCES `mensagem`(`id`) ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `conversa_leitura` ADD CONSTRAINT `fk_conversa_leitura_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `cadastro`(`id`) ON DELETE CASCADE ON UPDATE RESTRICT;
