-- Registra a configuração do segundo fator enviado por e-mail.
ALTER TABLE `cadastro`
    ADD COLUMN IF NOT EXISTS `dois_fatores_email_ativo` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS `dois_fatores_email_confirmado_em` DATETIME(3) NULL;

-- Inclui as tabelas 2FA que já existiam no schema, mas ainda não tinham migration.
CREATE TABLE IF NOT EXISTS `autenticacao_totp` (
    `usuario_id` INTEGER NOT NULL,
    `segredo_criptografado` TEXT NOT NULL,
    `ativo` BOOLEAN NOT NULL DEFAULT false,
    `confirmado_em` DATETIME(3) NULL,
    `ultimo_passo_utilizado` BIGINT NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `atualizado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`usuario_id`),
    CONSTRAINT `fk_autenticacao_totp_usuario`
        FOREIGN KEY (`usuario_id`) REFERENCES `cadastro` (`id`)
        ON DELETE CASCADE ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `codigo_recuperacao_2fa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `codigo_hash` VARCHAR(255) NOT NULL,
    `usado_em` DATETIME(3) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_codigo_recuperacao_disponivel` (`usuario_id`, `usado_em`),
    INDEX `idx_codigo_recuperacao_usuario` (`usuario_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_codigo_recuperacao_2fa_usuario`
        FOREIGN KEY (`usuario_id`) REFERENCES `cadastro` (`id`)
        ON DELETE CASCADE ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `desafio_login_2fa` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `usuario_id` INTEGER NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `codigo_hash` VARCHAR(255) NOT NULL,
    `tentativas` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `expira_em` DATETIME(3) NOT NULL,
    `usado_em` DATETIME(3) NULL,
    `criado_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_desafio_login_token` (`token_hash`),
    INDEX `idx_desafio_login_expiracao` (`expira_em`),
    INDEX `idx_desafio_login_usuario` (`usuario_id`),
    PRIMARY KEY (`id`),
    CONSTRAINT `fk_desafio_login_2fa_usuario`
        FOREIGN KEY (`usuario_id`) REFERENCES `cadastro` (`id`)
        ON DELETE CASCADE ON UPDATE RESTRICT
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Bancos que já possuem a tabela recebem somente a coluna nova.
ALTER TABLE `desafio_login_2fa`
    ADD COLUMN IF NOT EXISTS `codigo_hash` VARCHAR(255) NOT NULL AFTER `token_hash`;
