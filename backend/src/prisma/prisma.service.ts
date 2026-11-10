// Disponibiliza a conexão com o banco de dados.
import "dotenv/config";

import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error("DATABASE_URL não foi configurada.");
    }

    const databaseUrlComFuso = new URL(databaseUrl);
    databaseUrlComFuso.searchParams.set("timezone", "-03:00");

    const adapter = new PrismaMariaDb(databaseUrlComFuso.toString());

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
