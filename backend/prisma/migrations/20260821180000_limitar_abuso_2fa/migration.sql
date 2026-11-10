-- Limita reenvios por desafio e acelera a contagem de solicitações recentes.
ALTER TABLE `desafio_login_2fa`
    ADD COLUMN `reenvios` TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER `tentativas`;

CREATE INDEX `idx_desafio_2fa_limite`
    ON `desafio_login_2fa` (`usuario_id`, `finalidade`, `criado_em`);
