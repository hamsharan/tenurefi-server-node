declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'test' | 'production';
      PORT: number;
      REDIS_HOST: string;
      REDIS_PASSWORD: string;
      REDIS_PORT: number;
      BULL_USER: string;
      BULL_PASSWORD: string;
    }
  }
}
