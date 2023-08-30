import { Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';

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
    req.payload = payload;
  } catch (err) {
    return res.status(HttpStatusCode.UNAUTHORIZED).json({
      error: err.name === 'TokenExpiredError' ? err.name : 'Unauthorized',
    });
  }

  return next();
};

export default isAuthenticated;
