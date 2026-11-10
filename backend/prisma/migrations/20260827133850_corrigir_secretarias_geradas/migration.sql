-- Migration historica originalmente aplicada em 2026-08-27.
-- O arquivo original nao foi versionado. Estas sao as alteracoes de schema
-- confirmadas pelo estado do banco e pelo schema versionado logo depois.

-- Permite setores sem secretaria durante o cadastro e a correcao de dados.
ALTER TABLE `setores` MODIFY COLUMN `secretaria_id` INTEGER NULL;

-- Mantem o nome de indice introspectado e versionado no schema Prisma.
-- O indice novo e criado primeiro para manter o suporte da chave estrangeira.
CREATE INDEX `idx_setores_secretaria_id` ON `setores`(`secretaria_id`);
DROP INDEX `idx_setores_secretaria` ON `setores`;
