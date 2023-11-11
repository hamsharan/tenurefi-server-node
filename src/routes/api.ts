import { Router } from 'express';

import Paths from '@src/constants/Paths';

import { AuthRouter } from './AuthRouter';
import CompanyRouter from './CompanyRouter';

const apiRouter = Router();

apiRouter.use(Paths.Auth.Base, AuthRouter);
apiRouter.use(Paths.Company.Base, CompanyRouter);

export default apiRouter;
