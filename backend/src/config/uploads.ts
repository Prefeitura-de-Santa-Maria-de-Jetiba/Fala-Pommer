// Define a pasta de uploads, que pode ficar fora do diretório do app.
import { join } from 'node:path';
import { mkdirSync } from 'node:fs';

export const UPLOADS_DIR =
    process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

// Garante que as subpastas existam (a pasta nova começa vazia).
for (const sub of ['chat', 'comunidades', 'perfis']) {
    mkdirSync(join(UPLOADS_DIR, sub), { recursive: true });
}