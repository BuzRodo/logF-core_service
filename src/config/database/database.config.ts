export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

export const databaseConfig = (): DatabaseConfig => ({
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USERNAME ?? 'placeholder',
  password: process.env.DB_PASSWORD ?? 'placeholder',
  database: process.env.DB_NAME ?? 'placeholder'
});
