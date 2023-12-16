import { compare } from 'bcrypt';
import { NextFunction, Request, Response, Router } from 'express';
import Joi from 'joi';
import { verify } from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import HttpStatusCode from '@src/constants/HttpStatusCode';
import Paths from '@src/constants/Paths';
import AuthService from '@src/services/AuthService';
import UserService from '@src/services/UserService';
import { RouteError } from '@src/types/classes';
import { hashToken, generateTokens } from 'src/utils/jwt';
import EnvVars from '@src/constants/EnvVars';
import db from '@src/utils/db';
import MailerService from '@src/services/MailerService';
import isAuthenticated from './middleware/isAuthenticated';

type AuthRequest = {
  email: string;
  password: string;
};

const AuthRequestSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

type RefreshTokenRequest = {
  refreshToken: string;
};

const RefreshTokenRequestSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

type ForgotPasswordRequest = {
  email: string;
};

const ForgotPasswordRequestSchema = Joi.object({
  email: Joi.string().email().required(),
});

type ResetPasswordRequest = {
  resetPasswordToken: string;
  userID: string;
  password: string;
};

const ResetPasswordRequestSchema = Joi.object({
  resetPasswordToken: Joi.string().required(),
  userID: Joi.string().uuid({ version: 'uuidv4' }).required(),
  password: Joi.string().required(),
});

interface IPayload extends JwtPayload {
  jti: string;
  userID?: string;
}

const Errors = {
  RequestBody: (error: string) => `Error validating request body: ${error}`,
  UserExists: 'An account is already associated with this email address',
  UserDoesNotExist: 'User does not exist',
  InvalidCredentials: 'Your email or password is incorrect',
  MissingRefreshToken: 'Missing refresh token',
  Unauthorized: 'Unauthorized',
  ResetPasswordNotRequested: 'Password has not been initiated for reset',
  InvalidPasswordToken: 'Invalid password token',
  ResetPasswordPeriodElapsed: 'Password token has expired',
};

export const AuthRouter = Router();

export const createAccount = async (email: string, password: string) => {
  const existingUser = await UserService.findUserByEmail(email);

  if (existingUser) {
    throw new RouteError(HttpStatusCode.BAD_REQUEST, Errors.UserExists);
  }

  return await db.$transaction(async () => {
    const user = await UserService.createUserByEmailAndPassword({
      email,
      password,
    });
    const jti = uuidv4();
    const { accessToken, refreshToken } = generateTokens(user.id, jti);
    await AuthService.addRefreshTokenToWhitelist({
      jti,
      refreshToken,
      userID: user.id,
    });

    return { accessToken, refreshToken };
  });
};

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: The user's email
 *               password:
 *                 type: string
 *                 description: The user's password
 *     responses:
 *       200:
 *         description: The user was successfully created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Bad request, user already exists or data is missing
 *       500:
 *         description: Internal server error
 */
AuthRouter.post(
  Paths.Auth.Register,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = AuthRequestSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error.message),
        );
      }

      const { email, password } = validationResult.value as AuthRequest;
      const { accessToken, refreshToken } = await createAccount(
        email,
        password,
      );

      return res.json({
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: The user's email
 *               password:
 *                 type: string
 *                 description: The user's password
 *     responses:
 *       200:
 *         description: The user was successfully logged in
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       403:
 *         description: Forbidden, invalid login credentials
 *       500:
 *         description: Internal server error
 */
AuthRouter.post(
  Paths.Auth.Login,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = AuthRequestSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error.message),
        );
      }

      const { email, password } = validationResult.value as AuthRequest;
      const existingUser = await UserService.findUserByEmail(email);

      if (!existingUser) {
        throw new RouteError(
          HttpStatusCode.FORBIDDEN,
          Errors.InvalidCredentials,
        );
      }

      const validPassword = await compare(password, existingUser.password);
      if (!validPassword) {
        throw new RouteError(
          HttpStatusCode.FORBIDDEN,
          Errors.InvalidCredentials,
        );
      }

      const jti = uuidv4();
      const { accessToken, refreshToken } = generateTokens(
        existingUser.id,
        jti,
      );
      await AuthService.addRefreshTokenToWhitelist({
        jti,
        refreshToken,
        userID: existingUser.id,
      });
      // let jwtToken = req.headers.authorization?.split(' ')[1];
    
      // res.cookie('token', jwtToken, { httpOnly: true, secure: true, sameSite: 'Strict' });
      res.cookie('token', accessToken, {httpOnly: true});

      return res.json({
        accessToken,
        refreshToken,
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Requests a users password to be reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 description: The user's email
 *     responses:
 *       200:
 *         description: The user password reset request was successfully
 *       400:
 *         description: Bad Request, request body validation failed
 *       403:
 *         description: Forbidden, user doesn't exist
 *       500:
 *         description: Internal server error
 */
AuthRouter.post(
  Paths.Auth.ForgotPassword,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = ForgotPasswordRequestSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error.message),
        );
      }

      const { email } = validationResult.value as ForgotPasswordRequest;

      const user = await UserService.findUserByEmail(email);
      if (!user) {
        throw new RouteError(HttpStatusCode.FORBIDDEN, Errors.UserDoesNotExist);
      }

      await db.$transaction(async () => {
        const resetPasswordToken = await UserService.createResetPasswordToken(
          user.id,
        );

        MailerService.sendMail(email, {
          type: 'forgotpassword',
          content: { resetPasswordToken, userID: user.id },
        });
      });

      return res.json();
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Resets a user's password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resetPasswordToken
 *               - userID
 *               - password
 *             properties:
 *               resetPasswordToken:
 *                 type: string
 *                 description: The user's reset password token
 *               userID:
 *                 type: string
 *                 description: The user's ID
 *               password:
 *                 type: string
 *                 description: The user's new password
 *     responses:
 *       200:
 *         description: The user password was successfully reset
 *       400:
 *         description: Bad Request, request body validation failed
 *       403:
 *         description: Forbidden, invalid or expired reset token
 *       500:
 *         description: Internal server error
 */
AuthRouter.post(
  Paths.Auth.ResetPassword,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = ResetPasswordRequestSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error.message),
        );
      }

      const { resetPasswordToken, userID, password } =
        validationResult.value as ResetPasswordRequest;

      const user = await UserService.findUserById(userID);
      if (!user) {
        throw new RouteError(HttpStatusCode.FORBIDDEN, Errors.UserDoesNotExist);
      }

      if (!user.resetPassword) {
        throw new RouteError(
          HttpStatusCode.FORBIDDEN,
          Errors.ResetPasswordNotRequested,
        );
      }

      const isValid = await compare(resetPasswordToken, user.resetPassword);
      if (!isValid) {
        throw new RouteError(
          HttpStatusCode.FORBIDDEN,
          Errors.InvalidPasswordToken,
        );
      }

      if (user.resetPasswordAt! < new Date()) {
        await UserService.deleteResetPasswordToken(userID);
        throw new RouteError(
          HttpStatusCode.FORBIDDEN,
          Errors.ResetPasswordPeriodElapsed,
        );
      }

      await UserService.resetPassword(password, userID);

      return res.json();
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh the access token using a refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token to exchange for a new access token
 *     responses:
 *       200:
 *         description: Access token was successfully refreshed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       401:
 *         description: Unauthorized, invalid or expired refresh token
 *       500:
 *         description: Internal server error
 */
AuthRouter.post(
  Paths.Auth.RefreshToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = RefreshTokenRequestSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error.message),
        );
      }

      const { refreshToken } = validationResult.value as RefreshTokenRequest;
      const payload = verify(
        refreshToken,
        EnvVars.JwtRefreshSecret,
      ) as IPayload;
      const savedRefreshToken = await AuthService.findRefreshTokenById(
        payload.jti,
      );
      if (!savedRefreshToken || savedRefreshToken.revoked) {
        throw new RouteError(HttpStatusCode.UNAUTHORIZED, Errors.Unauthorized);
      }

      const hashedToken = hashToken(refreshToken);
      if (hashedToken !== savedRefreshToken.hashedToken) {
        throw new RouteError(HttpStatusCode.UNAUTHORIZED, Errors.Unauthorized);
      }

      const user = await UserService.findUserById(payload.userID);
      if (!user) {
        throw new RouteError(HttpStatusCode.UNAUTHORIZED, Errors.Unauthorized);
      }

      await AuthService.deleteRefreshTokenById(savedRefreshToken.id);
      const jti = uuidv4();
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(
        user.id,
        jti,
      );
      await AuthService.addRefreshTokenToWhitelist({
        jti,
        refreshToken: newRefreshToken,
        userID: user.id,
      });

      return res.json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      next(err);
    }
  },
);

AuthRouter.post(
  Paths.Auth.Test,
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
      
    const token = req.cookies['token']; // Make sure the key matches the cookie name set at login
    if (!token) {
      return res.status(401).send('No token found in cookies');
    }

    
      return res.json({
        accessToken: 'test',
      });
  },
);

export default AuthRouter;
