CREATE TABLE `token_push` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `token` VARCHAR(512) NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `sessao_id` VARCHAR(191) NOT NULL,
    `plataforma` VARCHAR(20) NOT NULL,
    `criado_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `atualizado_em` DATETIME(0) NOT NULL,

    UNIQUE INDEX `uq_token_push_token`(`token`),
    INDEX `idx_token_push_usuario`(`usuario_id`),
    INDEX `idx_token_push_sessao`(`sessao_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `token_push`
    ADD CONSTRAINT `fk_token_push_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `cadastro`(`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT;

ALTER TABLE `token_push`
    ADD CONSTRAINT `fk_token_push_sessao`
    FOREIGN KEY (`sessao_id`) REFERENCES `sessao`(`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT;
