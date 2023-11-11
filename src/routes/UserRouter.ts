import { NextFunction, Request, Response, Router } from 'express';
import isAuthenticated from './middleware/isAuthenticated';
import logger from 'jet-logger';
import Joi, { ValidationError } from 'joi';
import { RouteError } from '@src/types/classes';
import HttpStatusCode from '@src/constants/HttpStatusCode';
import UserService from '@src/services/UserService';
import CompanyService from '@src/services/CompanyService';

type AuthPayload = {
  payload: {
    userID: string;
    iat: number;
    exp: number;
  };
};

const AuthPayloadSchema = Joi.object({
  payload: Joi.object()
    .keys({
      userID: Joi.string().required(),
      iat: Joi.number().required(),
      exp: Joi.number().required(),
    })
    .required(),
});

type UserUpdateRequest = {
  user: {
    name: string;
    email: string;
    companyRole: string;
  };
  company: {
    name: string;
    size: string;
  };
  payload: {
    userID: string;
    iat: number;
    exp: number;
  };
};

const UserUpdateRequestSchema = Joi.object({
  user: Joi.object()
    .keys({
      name: Joi.string().required(),
      email: Joi.string().email().required(),
      companyRole: Joi.string().required(),
    })
    .required(),
  company: Joi.object()
    .keys({
      name: Joi.string().required(),
      size: Joi.string().required(),
    })
    .required(),
  payload: Joi.object()
    .keys({
      userID: Joi.string().required(),
      iat: Joi.number().required(),
      exp: Joi.number().required(),
    })
    .required(),
});

const Errors = {
  RequestBody: (error: ValidationError) =>
    `Error validating request body: ${JSON.stringify(error)}`,
  Unauthorized: 'Unauthorized',
  DoesNotExist: 'User does not exists',
  CompanyDoesNotExist: 'Company does not exist',
  EmailTaken: 'Email has been taken',
};

const userRouter = Router();

userRouter.get(
  '/',
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = AuthPayloadSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error),
        );
      }

      const request = validationResult.value as AuthPayload;

      const userID = request.payload.userID;
      const user = await UserService.findUserById(userID);
      if (!user) {
        throw new RouteError(HttpStatusCode.BAD_REQUEST, Errors.DoesNotExist);
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, createdAt, updatedAt, ...filteredUser } = user;

      return res.json(filteredUser);
    } catch (err) {
      logger.err(err, true);
      next(err);
    }
  },
);

userRouter.put(
  '/',
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = UserUpdateRequestSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error),
        );
      }

      const request = validationResult.value as UserUpdateRequest;

      const userID = request.payload.userID;
      const user = await UserService.findUserById(userID);
      if (!user) {
        throw new RouteError(HttpStatusCode.BAD_REQUEST, Errors.DoesNotExist);
      }

      const emailUser = await UserService.findUserByEmail(request.user.email);

      if (emailUser && emailUser.id !== userID) {
        throw new RouteError(HttpStatusCode.BAD_REQUEST, Errors.EmailTaken);
      }

      if (!user.companyID) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.CompanyDoesNotExist,
        );
      }

      if (!user.companyRole) {
        throw new RouteError(HttpStatusCode.UNAUTHORIZED, Errors.Unauthorized);
      }

      const updatedUser = await UserService.updateUser(request.user, userID);
      const updatedCompany = await CompanyService.updateCompany(
        request.company,
        user.companyID,
      );

      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        password,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        createdAt: UCreatedAt,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        updatedAt: UUpdatedAt,
        ...filteredUser
      } = updatedUser;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createdAt, updatedAt, ...filteredCompany } = updatedCompany;

      return res.json({ user: filteredUser, company: filteredCompany });
    } catch (err) {
      logger.err(err, true);
      next(err);
    }
  },
);

export default userRouter;
