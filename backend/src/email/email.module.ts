// Registra o serviço responsável pelo envio de e-mails.
import { Module } from "@nestjs/common";
import { EmailService } from "./email.service";

@Module({
    providers: [EmailService],
    exports: [EmailService]
})
export class EmailModule {}
