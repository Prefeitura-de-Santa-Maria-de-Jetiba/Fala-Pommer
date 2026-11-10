ALTER TABLE `historico_administrativo`
    MODIFY COLUMN `acao`
        ENUM('usuario_desativado', 'usuario_reativado') NOT NULL,
    MODIFY COLUMN `motivo` VARCHAR(500) NULL,
    ADD COLUMN `tipo_usuario_anterior`
        ENUM('user', 'admin', 'funcionario', 'superAdmin') NULL,
    ADD COLUMN `setor_id_anterior` INTEGER NULL,
    ADD COLUMN `secretaria_id_anterior` INTEGER NULL;
