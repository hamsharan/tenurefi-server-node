import swaggerJSDoc, { Options } from 'swagger-jsdoc';
import { SwaggerOptions } from 'swagger-ui-express';

import EnvVars from '@src/constants/EnvVars';

const options: Options = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Tenure API',
      version: '0.1.0',
      description: 'API for Tenure mobile app and web',
    },
    servers: [
      {
        url: `http://localhost:${EnvVars.Port}`,
      },
    ],
  },
  apis: ['./src/routes/*.ts'],
};

export const swaggerDocs = swaggerJSDoc(options);
export const swaggerOptions: SwaggerOptions = {};
