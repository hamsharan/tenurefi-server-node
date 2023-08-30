import resetDb from './reset-db';

export const mochaHooks = {
  async afterAll() {
    await resetDb();
  },
};
