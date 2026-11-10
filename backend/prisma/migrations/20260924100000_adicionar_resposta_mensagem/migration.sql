-- Permite vincular uma mensagem à mensagem original que está sendo respondida.
ALTER TABLE `mensagem`
    ADD COLUMN `mensagem_respondida_id` INTEGER NULL AFTER `setor_id`,
    ADD INDEX `idx_mensagem_respondida` (`mensagem_respondida_id`);

ALTER TABLE `mensagem`
    ADD CONSTRAINT `fk_mensagem_respondida`
    FOREIGN KEY (`mensagem_respondida_id`) REFERENCES `mensagem`(`id`)
    ON DELETE SET NULL ON UPDATE RESTRICT;
