CREATE TABLE `sessao` (
    `id` VARCHAR(191) NOT NULL,
    `usuario_id` INTEGER NOT NULL,
    `refresh_token_hash` CHAR(64) NOT NULL,
    `nome_dispositivo` VARCHAR(150) NULL,
    `plataforma` VARCHAR(30) NULL,
    `ultimo_uso_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `revogada_em` DATETIME(0) NULL,
    `criado_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_sessao_refresh_token_hash`(`refresh_token_hash`),
    INDEX `idx_sessao_usuario`(`usuario_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `sessao`
    ADD CONSTRAINT `fk_sessao_usuario`
    FOREIGN KEY (`usuario_id`) REFERENCES `cadastro`(`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT;
