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

  /**
 * @swagger
 * /contribution/gift:
 *   post:
 *     summary: Contribute to a specific employee's savings goal
 *     tags: [Contribution]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payload:
 *                 type: object
 *                 properties:
 *                   userID:
 *                     type: string
 *                     description: ID of the user (owner) making the contribution.
 *               employeeId:
 *                 type: string
 *                 description: ID of the employee to whom the contribution is being made.
 *               goalId:
 *                 type: string
 *                 description: ID of the specific savings goal.
 *               giftAmount:
 *                 type: number
 *                 format: double
 *                 description: The amount to be contributed.
 *             required:
 *               - payload
 *               - employeeId
 *               - goalId
 *               - giftAmount
 *     responses:
 *       200:
 *         description: Contribution successful
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */
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

  /**
 * @swagger
 * /contribution/gift-all:
 *   post:
 *     summary: Contribute to all employees' savings goals
 *     tags: [Contribution]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               payload:
 *                 type: object
 *                 properties:
 *                   userID:
 *                     type: string
 *                     description: ID of the user (owner) making the contribution.
 *               giftAmount:
 *                 type: number
 *                 format: double
 *                 description: The amount to be contributed to each employee.
 *             required:
 *               - payload
 *               - giftAmount
 *     responses:
 *       200:
 *         description: Contributions to all employees successful
 *       500:
 *         description: Internal server error
 */
  ContributionRouter.post(
    Paths.Contribution.GiftAll,
    isAuthenticated,
    async(req: Request, res:Response, next:NextFunction) => {
        try {
            
            const userId = req.body.payload.userID
            const giftAmount = req.body.giftAmount;
            if(!userId || !giftAmount) {
                return res.status(400).send({message: 'Missing required fields'});
            }
            // Call the service function
            const result = await ContributionService.contributeToAllEmployees({ userId, giftAmount});
            res.status(200).send(result);
        } catch (error) {
            console.error(error);
            res.status(500).send({ message: 'Internal Server Error', error: error.message });
        }

  })
  export default ContributionRouter;

