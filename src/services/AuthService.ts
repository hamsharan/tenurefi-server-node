import db from '@src/utils/db';
import { hashToken } from 'src/utils/jwt';

interface AddRefreshTokenRequest {
  jti: string;
  refreshToken: string;
  userId: string;
}

const addRefreshTokenToWhitelist = (data: AddRefreshTokenRequest) => {
  const { jti: id, refreshToken, userId } = data;
  const hashedToken = hashToken(refreshToken);

  return db.refreshToken.create({
    data: {
      id,
      hashedToken,
      userId,
    },
  });
};

const findRefreshTokenById = (id: string) => {
  return db.refreshToken.findUnique({
    where: {
      id,
    },
  });
};

const deleteRefreshTokenById = (id: string) => {
  return db.refreshToken.delete({
    where: {
      id,
    },
  });
};

const revokeTokensForUser = (userId: string) => {
  return db.refreshToken.updateMany({
    where: {
      userId,
    },
    data: {
      revoked: true,
    },
  });
};

export default {
  addRefreshTokenToWhitelist,
  findRefreshTokenById,
  deleteRefreshTokenById,
  revokeTokensForUser,
} as const;
