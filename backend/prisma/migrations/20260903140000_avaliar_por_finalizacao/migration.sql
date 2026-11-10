CREATE TABLE `conversa_finalizacao` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversa_id` INTEGER NOT NULL,
    `finalizada_por_id` INTEGER NOT NULL,
    `ultima_mensagem_id` INTEGER NULL,
    `finalizada_em` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uq_finalizacao_conversa_mensagem`(`conversa_id`, `ultima_mensagem_id`),
    INDEX `idx_finalizacao_responsavel`(`finalizada_por_id`),
    INDEX `idx_finalizacao_ultima_mensagem`(`ultima_mensagem_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `conversa_finalizacao`
    ADD CONSTRAINT `fk_finalizacao_conversa`
    FOREIGN KEY (`conversa_id`) REFERENCES `conversa`(`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT,
    ADD CONSTRAINT `fk_finalizacao_responsavel`
    FOREIGN KEY (`finalizada_por_id`) REFERENCES `cadastro`(`id`)
    ON DELETE RESTRICT ON UPDATE RESTRICT,
    ADD CONSTRAINT `fk_finalizacao_ultima_mensagem`
    FOREIGN KEY (`ultima_mensagem_id`) REFERENCES `mensagem`(`id`)
    ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE `avaliacao`
    ADD COLUMN `finalizacao_id` INTEGER NULL;

INSERT INTO `conversa_finalizacao` (
    `conversa_id`,
    `finalizada_por_id`,
    `ultima_mensagem_id`,
    `finalizada_em`
)
SELECT
    `avaliacao`.`conversa_id`,
    MIN(`avaliacao`.`avaliador_id`),
    (
        SELECT MAX(`mensagem`.`id`)
        FROM `mensagem`
        WHERE `mensagem`.`conversa_id` = `avaliacao`.`conversa_id`
    ),
    MIN(`avaliacao`.`criada_em`)
FROM `avaliacao`
GROUP BY `avaliacao`.`conversa_id`;

UPDATE `avaliacao`
INNER JOIN `conversa_finalizacao`
    ON `conversa_finalizacao`.`conversa_id` = `avaliacao`.`conversa_id`
SET `avaliacao`.`finalizacao_id` = `conversa_finalizacao`.`id`;

ALTER TABLE `avaliacao`
    DROP FOREIGN KEY `fk_avaliacao_conversa`,
    DROP INDEX `uq_avaliacao_conversa_avaliador`,
    DROP COLUMN `conversa_id`,
    MODIFY `finalizacao_id` INTEGER NOT NULL,
    ADD UNIQUE INDEX `uq_avaliacao_finalizacao_avaliador`(`finalizacao_id`, `avaliador_id`),
    ADD CONSTRAINT `fk_avaliacao_finalizacao`
    FOREIGN KEY (`finalizacao_id`) REFERENCES `conversa_finalizacao`(`id`)
    ON DELETE CASCADE ON UPDATE RESTRICT;
