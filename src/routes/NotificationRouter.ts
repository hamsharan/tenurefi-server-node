import { Request, Response, NextFunction, Router } from 'express';
import isAuthenticated, {
  JWTAuthPayload,
  JWTAuthPayloadSchema,
} from './middleware/isAuthenticated';
import Joi from 'joi';

import Paths from '@src/constants/Paths';
import HttpStatusCode from '@src/constants/HttpStatusCode';
import UserService from '@src/services/UserService';
import NotificationService from '@src/services/NotificationService';

import EnvVars from '@src/constants/EnvVars';
import db from '@src/utils/db';
import { RouteError } from '@src/types/classes';

import expo, { ExpoPushMessage } from 'expo-server-sdk';

const expoPush = new expo();

type AuthPayload = {
  payload: JWTAuthPayload;
};

const AuthPayloadSchema = Joi.object({
  payload: JWTAuthPayloadSchema,
});

type Notification = {
  title: string,
  body: string
}

const NotificationSchema = Joi.object({
  title: Joi.string().required(),
  body: Joi.string().required(),
})

type SingleNotification = {
  name: string,
  title: string,
  body: string
}

const SingleNotificationSchema = Joi.object({
  name: Joi.string().required(),
  title: Joi.string().required(),
  body: Joi.string().required(),
})

type DeviceToken = {
  deviceToken: string
}

const DeviceTokenSchema = Joi.object({
  deviceToken: Joi.string().required(),
})


const Errors = {
  RequestBody: (error: string) =>
    `Error validating request body: ${JSON.stringify(error)}`,
  RequestParam: (error: string) =>
    `Error validating request body: ${JSON.stringify(error)}`,
  UserNotFound: 'User not found',
  EmployerNotFound: 'Employer not found',
  EmployeesNotFound: 'Employees not found',

};

const notificationRouter = Router();

notificationRouter.post(
  '/',
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResultBody = AuthPayloadSchema.validate(req.body);
      if (validationResultBody.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResultBody.error.message),
        );
      }

      const validationResultParam = NotificationSchema.validate(req.params);
      if (validationResultParam.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestParam(validationResultParam.error.message),
        );
      }

      const { payload } = validationResultBody.value as AuthPayload;
      const notification = validationResultParam.value as Notification;
      
      const userID = payload.userID;
      const employer = await UserService.findUserById(userID);
      if (!employer || !employer.companyID) {
        throw new RouteError(
          HttpStatusCode.NOT_FOUND,
          Errors.EmployerNotFound,
        );
      }

      const employees = await NotificationService.findEmployeeDeviceTokensByCompanyID(employer.companyID);
      if (!employees) {
        throw new RouteError(
          HttpStatusCode.NOT_FOUND,
          Errors.EmployeesNotFound,
        );
      }

      const deviceTokens = employees.map((employee: { deviceToken: string; }) => employee.deviceToken).filter(Boolean);

      const messages: ExpoPushMessage[] = deviceTokens.map((deviceToken: string) => ({
        to: deviceToken,
        title: notification.title,
        body: notification.body,
      }));

      const receipts = await expoPush.sendPushNotificationsAsync(messages);
      console.log('Push notifications sent successfully:', receipts);

      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
)

notificationRouter.post(
  Paths.Notification.Single,
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResultBody = AuthPayloadSchema.validate(req.body);
      if (validationResultBody.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResultBody.error.message),
        );
      }

      const validationResultParam = SingleNotificationSchema.validate(req.params);
      if (validationResultParam.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestParam(validationResultParam.error.message),
        );
      }

      const { payload } = validationResultBody.value as AuthPayload;
      const notification = validationResultParam.value as SingleNotification;
      
      const userID = payload.userID;
      const employer = await UserService.findUserById(userID);
      if (!employer || !employer.companyID) {
        throw new RouteError(
          HttpStatusCode.NOT_FOUND,
          Errors.EmployerNotFound,
        );
      }

      const employeeDeviceToken = await NotificationService.findEmployeeDeviceTokensByName(notification.name, employer.companyID);
      if (!employeeDeviceToken) {
        throw new RouteError(
          HttpStatusCode.NOT_FOUND,
          Errors.EmployeesNotFound,
        );
      }

      const message: ExpoPushMessage = {
        to: employeeDeviceToken,
        title: notification.title,
        body: notification.body,
      };

      const receipts = await expoPush.sendPushNotificationsAsync([message]);
      console.log('Push notifications sent successfully:', receipts);

      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
)

notificationRouter.post(
  Paths.Notification.DeviceToken,
  isAuthenticated,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResultBody = AuthPayloadSchema.validate(req.body);
      if (validationResultBody.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestBody(validationResultBody.error.message),
        );
      }

      const validationResultParam = DeviceTokenSchema.validate(req.params);
      if (validationResultParam.error) {
        throw new RouteError(
          HttpStatusCode.BAD_REQUEST,
          Errors.RequestParam(validationResultParam.error.message),
        );
      }

      const { payload } = validationResultBody.value as AuthPayload;
      const { deviceToken } = validationResultParam.value as DeviceToken;
      
      const userID = payload.userID;
      const user = await UserService.findUserById(userID);
      if (!user || !user.id) {
       throw new RouteError(
          HttpStatusCode.NOT_FOUND,
          Errors.UserNotFound,
        );
      }

      await NotificationService.updateUserDeviceToken(user.id, deviceToken)

      return res.json({ success: true });
    } catch (err) {
      next(err);
    }
  },
);

export default notificationRouter;