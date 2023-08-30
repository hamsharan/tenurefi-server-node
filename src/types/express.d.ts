import { createClient } from 'redis';

declare global {
  namespace Express {
    interface Request {
      redisClient: ReturnType<typeof createClient>;
    }
  }
}
