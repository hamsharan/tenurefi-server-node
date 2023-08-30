import cors from 'cors';
import express, { NextFunction, Request, Response, Router } from 'express';
import helmet from 'helmet';
import logger from 'jet-logger';
import morgan from 'morgan';
import passport from 'passport';
import swaggerUi from 'swagger-ui-express';

import 'express-async-errors';

import EnvVars from '@src/constants/EnvVars';
import { Environments } from './constants/Environments';
import HttpStatusCode from '@src/constants/HttpStatusCode';
import { Messages } from '@src/constants/Messages';
import Paths from '@src/constants/Paths';
import { swaggerDocs, swaggerOptions } from '@src/docs/swaggerOptions';
import { RouteError } from '@src/types/classes';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(passport.initialize());

if (EnvVars.NodeEnv === Environments.Development) {
  app.use(morgan('dev'));
}

if (EnvVars.NodeEnv === Environments.Production) {
  app.use(helmet());
}

app.get('/health', (request: Request, response: Response) => {
  response
    .status(HttpStatusCode.OK)
    .json({
      message: Messages.Running(EnvVars.Port),
      info: { url: `${request.protocol}://${request.hostname}${request.path}` },
    })
    .end();
});

app.use(Paths.ApiDocs.Base, swaggerUi.serve, swaggerUi.setup(swaggerDocs, swaggerOptions));

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _: Request, res: Response, next: NextFunction) => {
  if (EnvVars.NodeEnv !== Environments.Test) {
    logger.err(err, true);
  }

  let status = HttpStatusCode.BAD_REQUEST;

  if (err instanceof RouteError) {
    status = err.status;
  }

  return res.status(status).json({ error: err.message });
});

export default app;
