import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import logger from 'jet-logger';
import { sign } from 'jsonwebtoken';
import { exit } from 'process';

const prisma = new PrismaClient();

async function main() {
  const testUserId = '1fb8cd91-40f1-419b-b9f9-a6873affe8ec';

  await prisma.user.upsert({
    where: { email: 'jafrisy@mfcgd.com' },
    update: {},
    create: {
      id: testUserId,
      email: 'jafrisy@mfcgd.com',
      password: '$2b$12$axvDaVkqcnnIMpVfUH7VRe6a.sbgdXds4glT.yef0X7JE/zdqv3YC',
    },
  });

  const refreshTokenId = 'fdff662d-b466-4b62-8397-30aa33a02681';
  const refreshToken = sign({ userId: testUserId, jti: refreshTokenId }, 'refreshsecret', {
    expiresIn: '8h',
  });
  const hashedToken = createHash('sha512').update(refreshToken).digest('hex');

  await prisma.refreshToken.upsert({
    where: { id: refreshTokenId },
    update: {},
    create: {
      id: refreshTokenId,
      userId: testUserId,
      hashedToken,
    },
  });

  logger.info('Test data seeded successfully');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    logger.err(error);
    await prisma.$disconnect();
    exit(1);
  });
