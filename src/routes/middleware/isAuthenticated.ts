import { Request, Response, NextFunction } from 'express';
import {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
  verify,
} from 'jsonwebtoken';

import EnvVars from '@src/constants/EnvVars';
import HttpStatusCode from '@src/constants/HttpStatusCode';
import Joi from 'joi';

export type JWTAuthPayload = {
  userID: string;
  iat: number;
  exp: number;
};

export const JWTAuthPayloadSchema = Joi.object().keys({
  userID: Joi.string().required(),
  iat: Joi.number().integer().required(),
  exp: Joi.number().integer().required(),
});

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies.token;
  console.log('authorization', req.cookies.token);
  if (!token) {
    return res.status(HttpStatusCode.UNAUTHORIZED).json({
      error: 'Unauthorized',
    });
  }

  try {
    // const token = authorization;
    console.log('token', token);
    const payload = verify(token, EnvVars.JwtAccessSecret);
    req.body = {
      ...req.body,
      payload,
    } as object;
  } catch (err) {
    if (
      err instanceof JsonWebTokenError ||
      err instanceof NotBeforeError ||
      err instanceof TokenExpiredError
    ) {
      return res.status(HttpStatusCode.UNAUTHORIZED).json({
        error: err.name,
      });
    } else {
      return res.status(HttpStatusCode.UNAUTHORIZED).json({
        error: 'Unauthorized',
      });
    }
  }

  return next();
};

export default isAuthenticated;
