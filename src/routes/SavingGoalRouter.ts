import Paths from '@src/constants/Paths';
import { NextFunction, Request, Response, Router } from 'express';
import isAuthenticated, {
  JWTAuthPayload,
  JWTAuthPayloadSchema,
} from './middleware/isAuthenticated';
import Joi from 'joi';
import { RouteError } from '@src/types/classes';
import HttpStatusCode from '@src/constants/HttpStatusCode';
import SavingGoalService, { CreateSavingGoal, UpdateSavingGoal } from '@src/services/SavingGoalService';
import UserService from '@src/services/UserService';

type AuthPayload = {
  payload: JWTAuthPayload;
};

const AuthPayloadSchema = Joi.object({
  payload: JWTAuthPayloadSchema,
});

type SavingGoalRequest = {
  savingGoals: CreateSavingGoal[];
  payload: JWTAuthPayload;
};

const SavingGoalRequestSchema = Joi.object({
  savingGoal: Joi.object()
    .keys({
      id: Joi.number(),
      title: Joi.string().required(),
      goal: Joi.number().integer().min(1).required(),
      percentage: Joi.number().integer().min(0).max(100).required(),
    })
    .required(),
  payload: JWTAuthPayloadSchema,
});

type IDSavingGoalRequest = {
  id: bigint;
};

const IDSavingGoalRequestSchema = Joi.object({
  id: Joi.number().required(),
});

type UserIDSavingGoalRequest = {
  userID: string;
};

const UserIDSavingGoalRequestSchema = Joi.object({
  userID: Joi.string().uuid({ version: 'uuidv4' }).required(),
});

type UpdateSavingGoalRequest = {
  savingGoal: UpdateSavingGoal;
  payload: JWTAuthPayload;
};

const UpdateSavingGoalRequestSchema = Joi.object({
  savingGoal: Joi.object()
    .keys({
      title: Joi.string(),
      goal: Joi.number().integer().min(1),
      percentage: Joi.number().integer().min(0).max(100),
    })
    .required(),
  payload: JWTAuthPayloadSchema,
});

const Errors = {
  RequestBody: (error: string) => error,
  UserDoesNotExist: 'User does not exist',
  UserDoesNotHaveAccess: 'User does not have access to this goal',
};

const savingGoalRouter = Router();

/**
 * @swagger
 * /saving-goal/{id}:
 *   get:
 *     summary: Get a saving goal by the goal's ID
 *     tags: [Saving Goal]
 *     parameters:
 *       path:
 *         name: id
 *         schema:
 *           type: integer
 *           required: true
 *           description: Numeric ID of the saving goal to get
 *     responses:
 *       200:
 *         description: The saving goal associated with the provided ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: number
 *                 title:
 *                   type: string
 *                 goal:
 *                   type: number
 *                 percentage:
 *                   type: number
 *       400:
 *         description: Bad request, body or parameter is missing
 *       403:
 *         description: Forbidden, user or saving goal is unavailable
 *       500:
 *         description: Internal server error
 */
savingGoalRouter.get(
  Paths.SavingGoal.ID,
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResultBody = AuthPayloadSchema.validate(req.body);
      if (validationResultBody.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResultBody.error.message),
        );
      }

      const validationResultParam = IDSavingGoalRequestSchema.validate(
        req.params,
      );
      if (validationResultParam.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResultParam.error.message),
        );
      }

      const { payload } = validationResultBody.value as AuthPayload;
      const { id } = validationResultParam.value as IDSavingGoalRequest;

      const userID = payload.userID;
      const user = await UserService.findUserById(userID);
      if (!user) {
        throw new RouteError(HttpStatusCode.FORBIDDEN, Errors.UserDoesNotExist);
      }

      const savingGoal = await SavingGoalService.getSavingGoal(id);
      if (!savingGoal || savingGoal.userID !== userID) {
        throw new RouteError(
          HttpStatusCode.FORBIDDEN,
          Errors.UserDoesNotHaveAccess,
        );
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createdAt, updatedAt, userID: _userID, ...filtered } = savingGoal;

      return res.json(filtered);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /saving-goal/{userID}:
 *   get:
 *     summary: Get all saving goals from a user
 *     tags: [Saving Goal]
 *     parameters:
 *       path:
 *         name: userID
 *         schema:
 *           type: string
 *           required: true
 *           description: UUID ID of user to get saving goals from
 *     responses:
 *       200:
 *         description: The saving goal associateds with the provided userID
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   title:
 *                     type: string
 *                   goal:
 *                     type: number
 *                   percentage:
 *                     type: number
 *       400:
 *         description: Bad request, body or parameter is missing
 *       403:
 *         description: Forbidden, user is not authorized or doesn't exist
 *       500:
 *         description: Internal server error
 */
savingGoalRouter.get(
  Paths.SavingGoal.UserID,
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResultBody = AuthPayloadSchema.validate(req.body);
      if (validationResultBody.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResultBody.error.message),
        );
      }

      const validationResultParam = UserIDSavingGoalRequestSchema.validate(
        req.params,
      );
      if (validationResultParam.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResultParam.error.message),
        );
      }

      const { payload } = validationResultBody.value as AuthPayload;
      const { userID } = validationResultParam.value as UserIDSavingGoalRequest;

      const employeer = await UserService.findUserById(payload.userID);
      if (!employeer || !employeer.companyRole) {
        throw new RouteError(
          HttpStatusCode.FORBIDDEN,
          Errors.UserDoesNotHaveAccess,
        );
      }

      const employee = await UserService.findUserById(userID);
      if (!employee) {
        throw new RouteError(HttpStatusCode.FORBIDDEN, Errors.UserDoesNotExist);
      }

      const savingGoals = await SavingGoalService.getSavingGoals(userID);

      return res.json(savingGoals);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /saving-goal:
 *   get:
 *     summary: Get all saving goals from the current user
 *     tags: [Saving Goal]
 *     responses:
 *       200:
 *         description: The saving goal associated with the current user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   title:
 *                     type: string
 *                   goal:
 *                     type: number
 *                   percentage:
 *                     type: number
 *       400:
 *         description: Bad request, body or parameter is missing
 *       403:
 *         description: Forbidden, user doesn't exist
 *       500:
 *         description: Internal server error
 */
savingGoalRouter.get(
  '/',
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = AuthPayloadSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error.message),
        );
      }

      const { payload } = validationResult.value as AuthPayload;

      const userID = payload.userID;
      const user = await UserService.findUserById(userID);
      if (!user) {
        throw new RouteError(HttpStatusCode.FORBIDDEN, Errors.UserDoesNotExist);
      }

      const savingGoals = await SavingGoalService.getSavingGoals(userID);

      return res.json(savingGoals);
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /saving-goal:
 *   post:
 *     summary: Creates saving goals for the current user
 *     tags: [Saving Goal]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - savingGoals
 *             properties:
 *               savingGoals:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     goal:
 *                       type: number
 *                     percentage:
 *                       type: number
 *     responses:
 *       200:
 *         description: Successfully created saving goal(s)
 *       400:
 *         description: Bad request, body is missing
 *       403:
 *         description: Forbidden, user doesn't exist
 *       500:
 *         description: Internal server error
 */
savingGoalRouter.post(
  Paths.SavingGoal.Base,
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = SavingGoalRequestSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error.message),
        );
      }

      const { savingGoals, payload } =
        validationResult.value as SavingGoalRequest;

      const userID = payload.userID;
      const user = await UserService.findUserById(userID);
      if (!user) {
        throw new RouteError(HttpStatusCode.FORBIDDEN, Errors.UserDoesNotExist);
      }

      await SavingGoalService.createServiceGoal(savingGoals, userID);

      return res.json();
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /saving-goal/{id}:
 *   put:
 *     summary: Updates saving goals for the current user
 *     tags: [Saving Goal]
 *     parameters:
 *       path:
 *         name: id
 *         schema:
 *           type: integer
 *           required: true
 *           description: Numeric ID of the saving goal to get
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - savingGoals
 *             properties:
 *               savingGoals:
 *                 type: object
 *                 properties:
 *                   title:
 *                     type: string
 *                   goal:
 *                     type: number
 *                   percentage:
 *                     type: number
 *     responses:
 *       200:
 *         description: Successfully updated saving goal(s)
 *       400:
 *         description: Bad request, body is missing
 *       403:
 *         description: Forbidden, user doesn't exist
 *       500:
 *         description: Internal server error
 */
savingGoalRouter.put(
  Paths.SavingGoal.Base,
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResultBody = UpdateSavingGoalRequestSchema.validate(req.body);
      if (validationResultBody.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResultBody.error.message),
        );
      }

      const validationResultParam = IDSavingGoalRequestSchema.validate(
        req.params,
      );
      if (validationResultParam.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResultParam.error.message),
        );
      }

      const { savingGoal, payload } =
        validationResultBody.value as UpdateSavingGoalRequest;
      const { id } = validationResultParam.value as IDSavingGoalRequest;

      const user = await UserService.findUserById(payload.userID);
      if (!user) {
        throw new RouteError(HttpStatusCode.FORBIDDEN, Errors.UserDoesNotExist);
      }

      if (!id) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody('ID of saving goals was not provided.'),
        );
      }

      await SavingGoalService.updateSavingGoal(savingGoal, id);

      return res.json();
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /saving-goal/{id}:
 *   delete:
 *     summary: Deletes saving goals associated with the id provided
 *     tags: [Saving Goal]
 *     parameters:
 *       path:
 *         name: id
 *         schema:
 *           type: integer
 *           required: true
 *           description: Numeric ID of the saving goal to delete
 *     responses:
 *       200:
 *         description: Successfully deleted saving goal
 *       400:
 *         description: Bad request, body or parameter is missing
 *       403:
 *         description: Forbidden, user is unauthorized or doesn't exist
 *       500:
 *         description: Internal server error
 */
savingGoalRouter.delete(
  Paths.SavingGoal.ID,
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResultBody = AuthPayloadSchema.validate(req.body);
      if (validationResultBody.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResultBody.error.message),
        );
      }

      const validationResultParam = IDSavingGoalRequestSchema.validate(
        req.params,
      );
      if (validationResultParam.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResultParam.error.message),
        );
      }

      const { payload } = validationResultBody.value as AuthPayload;
      const { id } = validationResultParam.value as IDSavingGoalRequest;

      const userID = payload.userID;
      const user = await UserService.findUserById(userID);
      if (!user) {
        throw new RouteError(HttpStatusCode.FORBIDDEN, Errors.UserDoesNotExist);
      }

      const savingGoal = await SavingGoalService.getSavingGoal(id);
      if (!savingGoal || savingGoal.userID !== userID) {
        throw new RouteError(
          HttpStatusCode.FORBIDDEN,
          Errors.UserDoesNotHaveAccess,
        );
      }

      await SavingGoalService.deleteSavingGoal(savingGoal.id);
      return res.json();
    } catch (err) {
      next(err);
    }
  },
);

export default savingGoalRouter;
