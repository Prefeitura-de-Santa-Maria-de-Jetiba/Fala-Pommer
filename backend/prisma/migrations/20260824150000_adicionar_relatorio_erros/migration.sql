CREATE TABLE `erro_autenticacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `tipo` ENUM('login', 'verificacao') NOT NULL,
    `criado_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_erro_autenticacao_usuario`(`usuario_id`),
    INDEX `idx_erro_autenticacao_criado_em`(`criado_em`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `erro_autenticacao`
    ADD CONSTRAINT `fk_erro_autenticacao_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `cadastro`(`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT;
