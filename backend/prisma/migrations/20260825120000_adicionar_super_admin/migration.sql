ALTER TABLE `cadastro`
    MODIFY `tipo_usuario` ENUM('user', 'admin', 'funcionario', 'superAdmin') NOT NULL DEFAULT 'user';
