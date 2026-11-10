ALTER TABLE `cadastro`
    ADD COLUMN `secretaria_id` INTEGER NULL;

CREATE INDEX `fk_cadastro_secretaria`
    ON `cadastro`(`secretaria_id`);

ALTER TABLE `cadastro`
    ADD CONSTRAINT `fk_cadastro_secretaria`
    FOREIGN KEY (`secretaria_id`) REFERENCES `secretaria`(`id`)
    ON DELETE SET NULL ON UPDATE RESTRICT;
