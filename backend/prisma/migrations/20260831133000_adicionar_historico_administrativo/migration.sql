CREATE TABLE `historico_administrativo` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `administrador_id` INTEGER NOT NULL,
    `usuario_alvo_id` INTEGER NOT NULL,
    `acao` ENUM('usuario_desativado') NOT NULL,
    `motivo` VARCHAR(500) NOT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_historico_administrador_data` (`administrador_id`, `criado_em`),
    INDEX `idx_historico_usuario_data` (`usuario_alvo_id`, `criado_em`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_historico_administrador`
        FOREIGN KEY (`administrador_id`) REFERENCES `cadastro` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT `fk_historico_usuario_alvo`
        FOREIGN KEY (`usuario_alvo_id`) REFERENCES `cadastro` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
