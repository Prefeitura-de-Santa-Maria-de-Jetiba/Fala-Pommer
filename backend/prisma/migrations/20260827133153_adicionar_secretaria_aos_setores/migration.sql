-- Adiciona a coluna como opcional para permitir o preenchimento dos setores existentes.
ALTER TABLE `setores` ADD COLUMN `secretaria_id` INTEGER NULL;

-- Migra para secretaria os registros que antes existiam somente como setores.
INSERT INTO `secretaria` (`secretaria`, `sigla_secretaria`)
SELECT
    `setores`.`setor`,
    `setores`.`sigla_setor`
FROM `setores`
WHERE NOT EXISTS (
    SELECT 1
    FROM `secretaria`
    WHERE `secretaria`.`sigla_secretaria` = `setores`.`sigla_setor`
);

-- Vincula cada setor à secretaria de mesma sigla.
UPDATE `setores`
SET `secretaria_id` = (
    SELECT MIN(`secretaria`.`id`)
    FROM `secretaria`
    WHERE `secretaria`.`sigla_secretaria` = `setores`.`sigla_setor`
)
WHERE `secretaria_id` IS NULL;

-- Impede novos setores sem secretaria após a migração dos dados existentes.
ALTER TABLE `setores` MODIFY COLUMN `secretaria_id` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `idx_setores_secretaria` ON `setores`(`secretaria_id`);

-- AddForeignKey
ALTER TABLE `setores` ADD CONSTRAINT `fk_setores_secretaria` FOREIGN KEY (`secretaria_id`) REFERENCES `secretaria`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;
