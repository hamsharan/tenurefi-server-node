import { Router } from 'express';

import Paths from '@src/constants/Paths';

import { AuthRouter } from './AuthRouter';

const apiRouter = Router();

apiRouter.use(Paths.Auth.Base, AuthRouter);

export default apiRouter;
