-- Permite ocultar o histórico apenas para o usuário desativado.
ALTER TABLE `conversa_participante`
    ADD COLUMN `ocultada_em` DATETIME(3) NULL DEFAULT NULL,
    ADD COLUMN `visivel_desde_mensagem_id` INTEGER NULL DEFAULT NULL,
    ADD INDEX `idx_participante_usuario_visibilidade` (`usuario_id`, `ocultada_em`);

ALTER TABLE `conversa_setor`
    ADD COLUMN `ocultada_para_usuario_em` DATETIME(3) NULL DEFAULT NULL,
    DROP INDEX `uq_conversa_setor_usuario`,
    ADD INDEX `idx_conversa_setor_usuario_visibilidade`
        (`setor_id`, `usuario_id`, `ocultada_para_usuario_em`);
