ALTER TABLE `cadastro`
    ADD COLUMN `desativado_em` DATETIME(3) NULL DEFAULT NULL,
    ADD COLUMN `desativado_por` INTEGER NULL DEFAULT NULL,
    ADD COLUMN `motivo_desativacao` VARCHAR(500) NULL DEFAULT NULL,
    ADD COLUMN `versao_token` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    ADD INDEX `idx_cadastro_status_id` (`desativado_em`, `id`),
    ADD INDEX `idx_cadastro_desativado_por` (`desativado_por`),
    ADD CONSTRAINT `fk_cadastro_desativado_por`
        FOREIGN KEY (`desativado_por`) REFERENCES `cadastro` (`id`)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT `chk_cadastro_desativacao_coerente`
        CHECK (
            (
                `desativado_em` IS NULL
                AND `desativado_por` IS NULL
                AND `motivo_desativacao` IS NULL
            )
            OR
            (
                `desativado_em` IS NOT NULL
                AND `desativado_por` IS NOT NULL
                AND `motivo_desativacao` IS NOT NULL
                AND CHAR_LENGTH(TRIM(`motivo_desativacao`)) BETWEEN 3 AND 500
            )
        );
