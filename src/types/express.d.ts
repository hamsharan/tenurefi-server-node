import { createClient } from 'redis';

declare global {
  namespace Express {
    interface Request {
      redis: ReturnType<typeof createClient>;
    }
  }
}
