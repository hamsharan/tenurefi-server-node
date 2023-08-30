export const RedisMessages = {
  RedisClientConnected: (url: string) => `Redis client connected at ${url}`,
  FailedToSetData: (templateName: string) =>
    `Failed to set data for ${templateName} in Redis`,
};
