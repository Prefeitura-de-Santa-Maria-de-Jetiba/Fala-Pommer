-- Registra cada transferência sem substituir o histórico da conversa.
CREATE TABLE `conversa_transferencia` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversa_id` INTEGER NOT NULL,
    `setor_origem_id` INTEGER NOT NULL,
    `setor_destino_id` INTEGER NOT NULL,
    `transferida_por_id` INTEGER NOT NULL,
    `motivo` VARCHAR(500) NOT NULL,
    `transferida_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_transferencia_conversa_data` (`conversa_id`, `transferida_em`),
    INDEX `idx_transferencia_setor_origem_data` (`setor_origem_id`, `transferida_em`),
    INDEX `idx_transferencia_setor_destino_data` (`setor_destino_id`, `transferida_em`),
    INDEX `idx_transferencia_responsavel` (`transferida_por_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `conversa_transferencia`
    ADD CONSTRAINT `fk_transferencia_conversa`
    FOREIGN KEY (`conversa_id`) REFERENCES `conversa`(`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
    ADD CONSTRAINT `fk_transferencia_setor_origem`
    FOREIGN KEY (`setor_origem_id`) REFERENCES `setores`(`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT `fk_transferencia_setor_destino`
    FOREIGN KEY (`setor_destino_id`) REFERENCES `setores`(`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT `fk_transferencia_responsavel`
    FOREIGN KEY (`transferida_por_id`) REFERENCES `cadastro`(`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

-- "equipe" identifica a mensagem interna da transferência;
-- "cidadao" identifica o aviso simplificado mostrado apenas ao cidadão.
ALTER TABLE `mensagem`
    ADD COLUMN `visibilidade` ENUM('todos', 'equipe', 'cidadao')
        NOT NULL DEFAULT 'todos' AFTER `sistema`,
    ADD COLUMN `transferencia_id` INTEGER NULL AFTER `visibilidade`,
    ADD COLUMN `setor_id` INTEGER NULL AFTER `transferencia_id`,
    ADD INDEX `idx_mensagem_conversa_visibilidade_id`
        (`conversa_id`, `visibilidade`, `id`),
    ADD INDEX `idx_mensagem_transferencia` (`transferencia_id`),
    ADD INDEX `idx_mensagem_setor` (`setor_id`);

-- Como ainda não havia transferências, o setor atual da conversa é também
-- o setor responsável pelas mensagens de setor já armazenadas.
UPDATE `mensagem`
INNER JOIN `conversa_setor`
    ON `conversa_setor`.`conversa_id` = `mensagem`.`conversa_id`
SET `mensagem`.`setor_id` = `conversa_setor`.`setor_id`
WHERE `mensagem`.`origem` = 'setor';

ALTER TABLE `mensagem`
    ADD CONSTRAINT `fk_mensagem_transferencia`
    FOREIGN KEY (`transferencia_id`) REFERENCES `conversa_transferencia`(`id`)
    ON DELETE SET NULL ON UPDATE RESTRICT,
    ADD CONSTRAINT `fk_mensagem_setor`
    FOREIGN KEY (`setor_id`) REFERENCES `setores`(`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Depois da transferência, o cidadão enxerga somente a partir da mensagem
-- pública que informa o novo setor. A equipe continua vendo todo o histórico.
ALTER TABLE `conversa_setor`
    ADD COLUMN `usuario_visivel_desde_mensagem_id` INTEGER NULL DEFAULT NULL,
    ADD INDEX `idx_conversa_setor_inicio_visibilidade_usuario`
        (`usuario_visivel_desde_mensagem_id`);
