import { Request, Response, NextFunction, Router } from 'express';
import logger from 'jet-logger';
import Joi, { ValidationError } from 'joi';
import generator from 'generate-password';

import isAuthenticated from './middleware/isAuthenticated';
import { RouteError } from '@src/types/classes';
import HttpStatusCode from '@src/constants/HttpStatusCode';
import UserService from '@src/services/UserService';
import CompanyService from '@src/services/CompanyService';
import Paths from '@src/constants/Paths';
import { createAccount } from './AuthRouter';
import { JwtPayload, verify } from 'jsonwebtoken';
import EnvVars from '@src/constants/EnvVars';

interface IPayload extends JwtPayload {
  jti: string;
  userID?: string;
}

type CompanyRequest = {
  name: string;
  size: string;
  payload: {
    userID: string;
    iat: number;
    exp: number;
  };
};

const CompanyRequestSchema = Joi.object({
  name: Joi.string().required(),
  size: Joi.string().required(),
  payload: Joi.object()
    .keys({
      userID: Joi.string().required(),
      iat: Joi.number().required(),
      exp: Joi.number().required(),
    })
    .required(),
});

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

type Employee = {
  name: string;
  email: string;
  dob: string;
  location: string;
};

type EmployeeRequest = {
  employees: Employee[];
  payload: {
    userID: string;
    iat: number;
    exp: number;
  };
};

const EmployeeSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  dob: Joi.string().isoDate().required(),
  location: Joi.string().required(),
});

const EmployeeRequestSchema = Joi.object({
  employees: Joi.array().items(EmployeeSchema),
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
  CompanyExists: 'Your company already exists',
  EmailTaken: (email: string) =>
    `The following emails are already associated with an account: ${email}`,
};

const companyRouter = Router();

/**
 * @swagger
 * /company:
 *  post:
 *    summary: Creates a new company and adds the employeer
 *    tags: [Company]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - name
 *              - size
 *            properties:
 *              name:
 *                type: string
 *                description: The name of the company
 *              size:
 *                type: string
 *                description: The size of the company
 *    responses:
 *      200:
 *        description: Company created successfully and employeer is associated
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: number
 *                name:
 *                  type: string
 *                size:
 *                  type: string
 *      400:
 *        description: Bad Request, missing fields or company already associated
 *      401:
 *        description: Unauthorized, invalid or no authentication token provided
 *      500:
 *        description: Internal Server Error
 */
companyRouter.post(
  '/',
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = CompanyRequestSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error),
        );
      }

      const request = validationResult.value as CompanyRequest;

      const userID = request.payload.userID;
      const user = await UserService.findUserById(userID);
      if (user?.companyID) {
        throw new RouteError(HttpStatusCode.BAD_REQUEST, Errors.CompanyExists);
      }

      const company = await CompanyService.createCompanyByNameAndSize(
        {
          name: request.name,
          size: request.size,
        },
        userID,
      );

      return res.json({
        id: company.id,
        name: company.name,
        size: company.size,
      });
    } catch (err) {
      logger.err(err, true);
      next(err);
    }
  },
);

/**
 * @swagger
 * /company:
 *  put:
 *    summary: Updates the existing company of the employeer
 *    tags: [Company]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - name
 *              - size
 *            properties:
 *              name:
 *                type: string
 *                description: The name of the company
 *              size:
 *                type: string
 *                description: The size of the company
 *    responses:
 *      200:
 *        description: Company of the employeer is updated successfully
 *        content:
 *          application/json:
 *            schema:
 *              type: object
 *              properties:
 *                id:
 *                  type: number
 *                name:
 *                  type: string
 *                size:
 *                  type: string
 *      400:
 *        description: Bad Request, missing fields or user is not employeer
 *      401:
 *        description: Unauthorized, invalid or no authentication token provided
 *      500:
 *        description: Internal Server Error
 */
companyRouter.put(
  '/',
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = CompanyRequestSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error),
        );
      }

      const request = validationResult.value as CompanyRequest;

      const userID = request.payload.userID;
      const user = await UserService.findUserById(userID);
      if (!user?.companyID || !user.companyRole) {
        throw new RouteError(HttpStatusCode.BAD_REQUEST, Errors.Unauthorized);
      }

      const company = await CompanyService.updateCompany(
        {
          name: request.name,
          size: request.size,
        },
        user.companyID,
      );

      return res.json({
        id: company.id,
        name: company.name,
        size: company.size,
      });
    } catch (err) {
      logger.err(err, true);
      next(err);
    }
  },
);

/**
 * @swagger
 * /company/employee:
 *  get:
 *    summary: Gets the users associated with the company
 *    tags: [Company]
 *    responses:
 *      200:
 *        description: List of users associated with the company
 *        content:
 *          application/json:
 *            schema:
 *              type: array
 *              items:
 *                type: object
 *                properties:
 *                  id:
 *                    type: string
 *                  email:
 *                    type: string
 *                  role:
 *                    type: string
 *                    nullable: true
 *                  name:
 *                    type: string
 *                    nullable: true
 *                  dob:
 *                    type: string
 *                    nullable: true
 *                  location:
 *                    type: string
 *                    nullable: true
 *      400:
 *        description: Bad Request, missing fields or user is not employeer
 *      401:
 *        description: Unauthorized, invalid or no authentication token provided
 *      500:
 *        description: Internal Server Error
 */
companyRouter.get(
  Paths.Company.Employee,
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
      if (!user?.companyID || !user.companyRole) {
        throw new RouteError(HttpStatusCode.BAD_REQUEST, Errors.Unauthorized);
      }

      const employees = await CompanyService.getCompanyEmployees(
        user.companyID,
      );

      return res.json(
        employees.map((emp) => ({
          id: emp.id,
          email: emp.email,
          role: emp.companyRole,
          name: emp.name,
          dob: emp.dob,
          location: emp.location,
        })),
      );
    } catch (err) {
      logger.err(err, true);
      next(err);
    }
  },
);

/**
 * @swagger
 * /company/employee:
 *  post:
 *    summary: Creates new users associated with the company
 *    tags: [Company]
 *    requestBody:
 *      required: true
 *      content:
 *        application/json:
 *          schema:
 *            type: object
 *            required:
 *              - employees
 *            properties:
 *              employees:
 *                type: array
 *                items:
 *                  type: object
 *                  properties:
 *                    name:
 *                      type: string
 *                    email:
 *                      type: string
 *                    dob:
 *                      type: string
 *                      format: date
 *                    location:
 *                      type: string
 *    responses:
 *      200:
 *        description: TBD
 *      400:
 *        description: Bad Request, missing fields or user is not employeer
 *      401:
 *        description: Unauthorized, invalid or no authentication token provided
 *      500:
 *        description: Internal Server Error
 */
companyRouter.post(
  Paths.Company.Employee,
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = EmployeeRequestSchema.validate(req.body);
      if (validationResult.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResult.error),
        );
      }

      const request = validationResult.value as EmployeeRequest;

      const userID = request.payload.userID;
      const user = await UserService.findUserById(userID);
      if (!user?.companyID || !user.companyRole) {
        throw new RouteError(HttpStatusCode.BAD_REQUEST, Errors.Unauthorized);
      }

      const emails: string[] = [];
      for (let i = 0; i < request.employees.length; i++) {
        const employee = await UserService.findUserByEmail(
          request.employees[i].email,
        );
        if (employee !== null) {
          logger.imp(employee, true);
          emails.push(request.employees[i].email);
        }
      }

      if (emails.length > 0) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.EmailTaken(emails.join('; ')),
        );
      }

      request.employees.forEach(async (emp) => {
        const password = generator.generate({
          numbers: true,
          symbols: true,
          strict: true,
        });
        const { accessToken } = await createAccount(emp.email, password);
        const payload = verify(
          accessToken,
          EnvVars.JwtAccessSecret,
        ) as IPayload;
        await UserService.updateUser(
          { ...emp, dob: new Date(emp.dob), companyID: user.companyID! },
          payload.userID!,
        );

        // TODO: Setup mailer
      });

      return res.json();
    } catch (err) {
      logger.err(err, true);
      next(err);
    }
  },
);

export default companyRouter;
