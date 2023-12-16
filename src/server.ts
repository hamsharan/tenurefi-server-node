import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
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
import { Queues } from '@src/constants/Queues';
import { swaggerDocs, swaggerOptions } from '@src/docs/swaggerOptions';
import ApiRouter from '@src/routes/api';
import { basicAuthMiddleware } from '@src/routes/middleware/basicAuth';
import QueueService from '@src/services/QueueService';
import { RouteError } from '@src/types/classes';
import redisClient from '@src/utils/redis';
const app = express();
const cookieParser = require('cookie-parser');

const queueService = QueueService.getInstance();
const defaultQueue = queueService.getQueue(Queues.DEFAULT);

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: Unreachable code error
BigInt.prototype.toJSON = function () {
  return parseInt(this.toString());
};

app.use(cookieParser()); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

app.use(cors({
  origin: 'http://localhost:5173', // or wherever your React app is served from
  credentials: true
}));


if (EnvVars.NodeEnv === Environments.Development) {
  app.use(morgan('dev'));
}

if (EnvVars.NodeEnv === Environments.Production) {
  app.use(helmet());
}

app.use((req, res, next) => {
  req.redis = redisClient;
  next();
});

app.get('/health', (request: Request, response: Response) => {
  response
    .status(HttpStatusCode.OK)
    .json({
      message: Messages.Running(EnvVars.Port),
      info: { url: `${request.protocol}://${request.hostname}${request.path}` },
    })
    .end();
});

if (defaultQueue) {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath(Paths.BullBoard.Base);

  createBullBoard({
    queues: [new BullMQAdapter(defaultQueue)],
    serverAdapter,
  });

  app.use(
    Paths.BullBoard.Base,
    basicAuthMiddleware,
    serverAdapter.getRouter() as Router,
  );
}



app.use(
  Paths.ApiDocs.Base,
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs, swaggerOptions),
);
app.use(Paths.Base, ApiRouter);

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
