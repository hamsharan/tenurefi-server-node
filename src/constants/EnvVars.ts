/* eslint-disable node/no-process-env */

import { Environments } from './Environments';

export default {
  NodeEnv: process.env.NODE_ENV || Environments.Development,
  Port: process.env.PORT || 3000,
  JwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'test',
  JwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'test',
  RedisHost: process.env.REDIS_HOST || 'redis',
  RedisPassword: process.env.REDIS_PASSWORD || '',
  RedisPort: process.env.REDIS_PORT || 6379,
  BullUser: process.env.BULL_USER || 'test',
  BullPassword: process.env.BULL_PASSWORD || 'test',
};
