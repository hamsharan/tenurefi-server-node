import { Request, Response, NextFunction } from 'express';
import {
  JsonWebTokenError,
  NotBeforeError,
  TokenExpiredError,
  verify,
} from 'jsonwebtoken';

import EnvVars from '@src/constants/EnvVars';
import HttpStatusCode from '@src/constants/HttpStatusCode';

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const { authorization } = req.headers;

  if (!authorization) {
    return res.status(HttpStatusCode.UNAUTHORIZED).json({
      error: 'Unauthorized',
    });
  }

  try {
    const token = authorization.split(' ')[1];
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
