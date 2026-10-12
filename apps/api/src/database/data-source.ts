import 'reflect-metadata';
import { config } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

// Este arquivo roda a partir de dist/database/ (a CLI usa a versão compilada).
// Raiz do repositório = 4 níveis acima: dist/database -> dist -> api -> apps -> raiz.
const here = import.meta.dirname;
config({
  path: [join(here, '../../../../.env'), join(process.cwd(), '.env')],
  quiet: true,
});

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(here, '..', 'modules', '**', '*.entity.js')],
  migrations: [join(here, 'migrations', '*.js')],
});
