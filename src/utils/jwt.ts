import { createHash } from 'crypto';
import { sign } from 'jsonwebtoken';

import EnvVars from '@src/constants/EnvVars';

const HASHING_ALGORITHM = 'sha512';

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

const generateAccessToken = (userId: string): string => {
  return sign({ userId }, EnvVars.JwtAccessSecret, {
    expiresIn: '15m',
  });
};

const generateRefreshToken = (userId: string, jti: string): string => {
  return sign({ userId, jti }, EnvVars.JwtRefreshSecret, {
    expiresIn: '8h',
  });
};

export const generateTokens = (userId: string, jti: string): TokenResponse => {
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId, jti);

  return { accessToken, refreshToken };
};

export const hashToken = (token: string): string => {
  return createHash(HASHING_ALGORITHM).update(token).digest('hex');
};
