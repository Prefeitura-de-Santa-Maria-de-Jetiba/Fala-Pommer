ALTER TABLE `conversa` MODIFY `tipo` ENUM('privada', 'grupo', 'setor', 'comunidade') NOT NULL DEFAULT 'privada';

ALTER TABLE `comunidade` ADD COLUMN `conversa_id` INTEGER NULL;
CREATE UNIQUE INDEX `uq_comunidade_conversa` ON `comunidade`(`conversa_id`);
ALTER TABLE `comunidade` ADD CONSTRAINT `fk_comunidade_conversa`
    FOREIGN KEY (`conversa_id`) REFERENCES `conversa`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
