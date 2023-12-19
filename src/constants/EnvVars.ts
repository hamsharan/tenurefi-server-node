/* eslint-disable node/no-process-env */

import { Environments } from './Environments';

export default {
  NodeEnv: process.env.NODE_ENV || Environments.Development,
  Port: process.env.PORT || 3000,
  JwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'test',
  JwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'test',
  RedisHost: process.env.REDIS_HOST || '127.0.0.1',
  RedisPassword: process.env.REDIS_PASSWORD || '',
  RedisPort: 6379,
  BullUser: process.env.BULL_USER || 'test',
  BullPassword: process.env.BULL_PASSWORD || 'test',
  GoogleClientID: process.env.GOOGLE_CLIENT_ID || '128984527429-iitdillruvit9dilkqod8vv4u9ca5unv.apps.googleusercontent.com',
  GoogleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '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',
  GmailOAuthRefreshToken:
    process.env.GMAIL_OAUTH ||
    '1//04Dv1__o0Cy6LCgYIARAAGAQSNwF-L9Irpm9OG6-to8H8xEu4qhaW4PP_we2CM6fGDlBipWZ76R7VpfT8R5vrrvSmIyvnSb074Oo',
};
