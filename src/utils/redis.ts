import { RedisClientOptions, createClient } from 'redis';
import logger from 'jet-logger';

import EnvVars from '@src/constants/EnvVars';
import { Messages } from '@src/constants/Messages';
import { RedisMessages } from '@src/constants/RedisMessages';

const redisUrl: string = `redis://${EnvVars.RedisPassword !== '' ? `:${EnvVars.RedisPassword}@` : ''}${
  EnvVars.RedisHost
}:${EnvVars.RedisPort}`;

const options: RedisClientOptions = {
  url: redisUrl,
};

const redisClient = createClient(options);

redisClient.on('connect', () => {
  logger.info(RedisMessages.RedisClientConnected(redisUrl));
});

redisClient.on('error', (err) => {
  logger.err(Messages.SomethingWentWrong(err));
});

redisClient.connect();

export default redisClient;
