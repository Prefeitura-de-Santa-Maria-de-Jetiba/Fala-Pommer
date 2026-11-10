ALTER TABLE `mensagem`
    ADD COLUMN `sistema` BOOLEAN NOT NULL DEFAULT false AFTER `origem`;
