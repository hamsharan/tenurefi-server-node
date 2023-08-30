import { compare } from 'bcrypt';
import { NextFunction, Request, Response, Router } from 'express';
import logger from 'jet-logger';
import Joi, { ValidationError } from 'joi';
import { verify } from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import HttpStatusCode from '@src/constants/HttpStatusCode';
import Paths from '@src/constants/Paths';
import AuthService from '@src/services/AuthService';
import UserService from '@src/services/UserService';
import { RouteError } from '@src/types/classes';
import { hashToken, generateTokens } from 'src/utils/jwt';

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

interface IPayload extends JwtPayload {
  jti: string;
  userId?: string;
}

const Errors = {
  RequestBody: (error: ValidationError) =>
    `Error validating request body: ${JSON.stringify(error)}`,
  UserExists: 'User already exists',
  InvalidCredentials: 'Invalid login credentials',
  MissingRefreshToken: 'Missing refresh token',
  Unauthorized: 'Unauthorized',
};

const authRouter = Router();

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
authRouter.post(
  Paths.Auth.Register,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = AuthRequestSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error),
        );
      }

      const { email, password } = validationResult.value as AuthRequest;
      const existingUser = await UserService.findUserByEmail(email);

      if (existingUser) {
        throw new RouteError(HttpStatusCode.BAD_REQUEST, Errors.UserExists);
      }

      const user = await UserService.createUserByEmailAndPassword({
        email,
        password,
      });
      const jti = uuidv4();
      const { accessToken, refreshToken } = generateTokens(user.id, jti);
      await AuthService.addRefreshTokenToWhitelist({
        jti,
        refreshToken,
        userId: user.id,
      });

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
authRouter.post(
  Paths.Auth.Login,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = AuthRequestSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error),
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
        userId: existingUser.id,
      });

      return res.json({
        accessToken,
        refreshToken,
      });
    } catch (err) {
      logger.err(err, true);
      next(err);
    }
  },
);

/**
 * @swagger
 * /auth/refreshToken:
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
authRouter.post(
  Paths.Auth.RefreshToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = RefreshTokenRequestSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error),
        );
      }

      const { refreshToken } = validationResult.value as RefreshTokenRequest;
      const payload = verify(refreshToken, '') as IPayload;
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

      const user = await UserService.findUserById(payload.userId);
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
        userId: user.id,
      });

      return res.json({
        accessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      logger.err(err, true);
      next(err);
    }
  },
);

export default authRouter;
