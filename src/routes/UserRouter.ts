import { NextFunction, Request, Response, Router } from 'express';
import isAuthenticated, {
  JWTAuthPayload,
  JWTAuthPayloadSchema,
} from './middleware/isAuthenticated';
import logger from 'jet-logger';
import Joi from 'joi';
import { RouteError } from '@src/types/classes';
import HttpStatusCode from '@src/constants/HttpStatusCode';
import UserService from '@src/services/UserService';
import CompanyService from '@src/services/CompanyService';
import db from '@src/utils/db';
import Paths from '@src/constants/Paths';
import { compare } from 'bcrypt';

type AuthPayload = {
  payload: JWTAuthPayload;
};

const AuthPayloadSchema = Joi.object({
  payload: JWTAuthPayloadSchema,
});

type UserUpdateRequest = {
  user?: {
    name?: string;
    email?: string;
    companyRole?: string;
  };
  company?: {
    name?: string;
    size?: string;
  };
  payload: JWTAuthPayload;
};

const UserUpdateRequestSchema = Joi.object({
  user: Joi.object().keys({
    name: Joi.string(),
    email: Joi.string().email(),
    companyRole: Joi.string(),
  }),
  company: Joi.object().keys({
    name: Joi.string(),
    size: Joi.string(),
  }),
  payload: JWTAuthPayloadSchema,
});

type ChangePassword = {
  oldPassword: string;
  newPassword: string;
  payload: JWTAuthPayload;
};

const ChangePasswordSchema = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: Joi.string().required(),
  payload: JWTAuthPayloadSchema,
});

const Errors = {
  RequestBody: (error: string) => `Error validating request body: ${error}`,
  Unauthorized: 'Unauthorized',
  DoesNotExist: 'User does not exists',
  CompanyDoesNotExist: 'Company does not exist',
  EmailTaken: 'Email has been taken',
  PasswordIncorrect: 'Current password is incorrect',
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
          Errors.RequestBody(validationResult.error.message),
        );
      }

      const request = validationResult.value as AuthPayload;

      const userID = request.payload.userID;
      const user = await UserService.findUserById(userID);
      if (!user) {
        throw new RouteError(HttpStatusCode.BAD_REQUEST, Errors.DoesNotExist);
      }

      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        password,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        resetPassword,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        resetPasswordAt,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        transferPin,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        createdAt,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        updatedAt,
        ...filteredUser
      } = user;

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
          Errors.RequestBody(validationResult.error.message),
        );
      }

      const request = validationResult.value as UserUpdateRequest;

      const userID = request.payload.userID;
      const user = await UserService.findUserById(userID);
      if (!user) {
        throw new RouteError(HttpStatusCode.BAD_REQUEST, Errors.DoesNotExist);
      }

      if (request.user?.email) {
        const emailUser = await UserService.findUserByEmail(request.user.email);
        if (emailUser && emailUser.id !== userID) {
          throw new RouteError(HttpStatusCode.BAD_REQUEST, Errors.EmailTaken);
        }
      }

      if (!user.companyRole) {
        throw new RouteError(HttpStatusCode.UNAUTHORIZED, Errors.Unauthorized);
      }

      const { updatedUser, updatedCompany } = await db.$transaction(
        async () => {
          const updatedUser = await UserService.updateUser(
            request.user ? request.user : {},
            userID,
          );

          if (!user.companyID) {
            throw new RouteError(
              HttpStatusCode.BAD_REQUEST,
              Errors.CompanyDoesNotExist,
            );
          }

          const updatedCompany = await CompanyService.updateCompany(
            request.company ? request.company : {},
            user.companyID,
          );

          return { updatedUser, updatedCompany };
        },
      );

      const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        password,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        resetPassword,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        resetPasswordAt,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        transferPin,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        createdAt: UCreatedAt,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        updatedAt: UUpdatedAt,
        ...filteredUser
      } = updatedUser;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createdAt, updatedAt, id, ...filteredCompany } = updatedCompany;

      return res.json({ ...filteredUser, company: filteredCompany });
    } catch (err) {
      logger.err(err, true);
      next(err);
    }
  },
);

userRouter.put(
  Paths.User.ChangePassword,
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = ChangePasswordSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error.message),
        );
      }

      const request = validationResult.value as ChangePassword;

      const userID = request.payload.userID;
      const user = await UserService.findUserById(userID);
      if (!user) {
        throw new RouteError(HttpStatusCode.FORBIDDEN, Errors.DoesNotExist);
      }

      const isValid = await compare(request.oldPassword, user.password);
      if (!isValid) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.PasswordIncorrect,
        );
      }

      await UserService.updateUser({ password: request.newPassword }, userID);

      return res.json();
    } catch (err) {
      logger.err(err, true);
      next(err);
    }
  },
);

export default userRouter;
