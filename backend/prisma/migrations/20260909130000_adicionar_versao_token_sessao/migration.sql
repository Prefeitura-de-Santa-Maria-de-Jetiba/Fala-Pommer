ALTER TABLE `sessao`
    ADD COLUMN `versao_token` INTEGER UNSIGNED NULL;

UPDATE `sessao`
INNER JOIN `cadastro`
    ON `cadastro`.`id` = `sessao`.`usuario_id`
SET `sessao`.`versao_token` = `cadastro`.`versao_token`;

ALTER TABLE `sessao`
    MODIFY `versao_token` INTEGER UNSIGNED NOT NULL;
