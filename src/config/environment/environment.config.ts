export interface EnvironmentConfig {
  nodeEnv: string;
  port: number;
}

export const environmentConfig = (): EnvironmentConfig => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000)
});
