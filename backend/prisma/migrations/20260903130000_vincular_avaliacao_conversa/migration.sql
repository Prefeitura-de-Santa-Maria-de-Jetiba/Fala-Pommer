ALTER TABLE `avaliacao`
    ADD COLUMN `conversa_id` INTEGER NOT NULL,
    ADD COLUMN `avaliador_id` INTEGER NOT NULL,
    ADD COLUMN `criada_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD UNIQUE INDEX `uq_avaliacao_conversa_avaliador`(`conversa_id`, `avaliador_id`),
    ADD INDEX `idx_avaliacao_avaliador`(`avaliador_id`);

ALTER TABLE `avaliacao`
    ADD CONSTRAINT `fk_avaliacao_conversa`
    FOREIGN KEY (`conversa_id`) REFERENCES `conversa`(`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
    ADD CONSTRAINT `fk_avaliacao_avaliador`
    FOREIGN KEY (`avaliador_id`) REFERENCES `cadastro`(`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT;
