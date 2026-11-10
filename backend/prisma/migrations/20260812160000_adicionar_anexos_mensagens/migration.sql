ALTER TABLE `mensagem`
    ADD COLUMN `arquivo_nome` VARCHAR(255) NULL,
    ADD COLUMN `arquivo_url` VARCHAR(500) NULL,
    ADD COLUMN `arquivo_tipo` VARCHAR(20) NULL,
    ADD COLUMN `arquivo_mime` VARCHAR(150) NULL,
    ADD COLUMN `arquivo_tamanho` INTEGER NULL;
