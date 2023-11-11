import { createHash } from 'crypto';
import { sign } from 'jsonwebtoken';

import EnvVars from '@src/constants/EnvVars';

const HASHING_ALGORITHM = 'sha512';

interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

const generateAccessToken = (userID: string): string => {
  return sign({ userID }, EnvVars.JwtAccessSecret, {
    expiresIn: '24h',
  });
};

const generateRefreshToken = (userID: string, jti: string): string => {
  return sign({ userID, jti }, EnvVars.JwtRefreshSecret, {
    expiresIn: '8h',
  });
};

export const generateTokens = (userID: string, jti: string): TokenResponse => {
  const accessToken = generateAccessToken(userID);
  const refreshToken = generateRefreshToken(userID, jti);

  return { accessToken, refreshToken };
};

export const hashToken = (token: string): string => {
  return createHash(HASHING_ALGORITHM).update(token).digest('hex');
};
