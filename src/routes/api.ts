import { Router } from 'express';

import Paths from '@src/constants/Paths';

import { AuthRouter } from './AuthRouter';
import UserRouter from './UserRouter';
import CompanyRouter from './CompanyRouter';
import SavingGoalRouter from './SavingGoalRouter';
import ContributionRouter from './ContributionRouter';

const apiRouter = Router();

apiRouter.use(Paths.Auth.Base, AuthRouter);
apiRouter.use(Paths.User.Base, UserRouter);
apiRouter.use(Paths.Company.Base, CompanyRouter);
apiRouter.use(Paths.SavingGoal.Base, SavingGoalRouter);
apiRouter.use(Paths.Contribution.Base, ContributionRouter);

export default apiRouter;
