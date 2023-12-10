import isAuthenticated, {
    JWTAuthPayload,
    JWTAuthPayloadSchema,
  } from './middleware/isAuthenticated';

  import { NextFunction, Request, Response, Router } from 'express';
  import Paths from '@src/constants/Paths';
  import HttpStatusCode from '@src/constants/HttpStatusCode';
  import SavingGoalService, {
    CreateSavingGoal,
    UpdateSavingGoal,
  } from '@src/services/SavingGoalService';

  import ContributionService from '@src/services/ContributionService';

  const ContributionRouter = Router();
  ContributionRouter.post(
    Paths.Contribution.Gift,
    isAuthenticated,
    async(req: Request, res:Response, next:NextFunction) => {
        try {
            const userId = req.body.payload.userID
            const {employeeId, goalId, giftAmount } = req.body;
    
            // Validate the request data
            if (!userId || !employeeId || !goalId || !giftAmount) {
                return res.status(400).send({ message: 'Missing required fields' });
            }
    
            // Call the service function
            const result = await ContributionService.contributeToSavings({ userId, employeeId, goalId, giftAmount });
            res.status(200).send(result);
        } catch (error) {
            console.error(error);
            res.status(500).send({ message: 'Internal Server Error', error: error.message });
        }

  })

  ContributionRouter.post(
    Paths.Contribution.GiftAll,
    isAuthenticated,
    async(req: Request, res:Response, next:NextFunction) => {
        try {
            
            const userId = req.body.payload.userID
            const amt = 5000;
            // Call the service function
            // const result = await ContributionService.contributeToAllEmployees({ userId, giftAmount});
            res.status(200).send("result");
        } catch (error) {
            console.error(error);
            res.status(500).send({ message: 'Internal Server Error', error: error.message });
        }

  })
  export default ContributionRouter;

