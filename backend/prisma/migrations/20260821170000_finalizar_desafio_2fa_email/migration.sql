-- Diferencia o uso do desafio e registra o instante do envio mais recente.
ALTER TABLE `desafio_login_2fa`
    ADD COLUMN `finalidade` ENUM('ativacao', 'login', 'desativacao') NOT NULL DEFAULT 'login' AFTER `usuario_id`,
    ADD COLUMN `ultimo_envio_em` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) AFTER `criado_em`;
