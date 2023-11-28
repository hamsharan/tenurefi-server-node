import EnvVars from '@src/constants/EnvVars';
import HttpStatusCode from '@src/constants/HttpStatusCode';
import { RouteError } from '@src/types/classes';
import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';

type Welcome = {
  invitee: string;
  name: string;
  email: string;
  password: string;
};

type ResetPassword = {
  userID: string;
  resetPasswordToken: string;
};

type Content = {
  type: 'welcome' | 'forgotpassword';
  content: Welcome | ResetPassword;
};

const SUBJECT_WELCOME = 'Welcome to Tenure';
const SUBJECT_RESET_PASSWORD = 'Reset Password';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    type: 'OAuth2',
    user: 'xuan@tenurefi.com',
    clientId: EnvVars.GoogleClientID,
    clientSecret: EnvVars.GoogleClientSecret,
    refreshToken: EnvVars.GmailOAuthRefreshToken,
  },
});

transporter.use(
  'compile',
  hbs({
    viewEngine: {
      // options
      defaultLayout: false,
      partialsDir: './views/partials',
      layoutsDir: './views/layouts',
    },
    viewPath: './views/layouts',
  }),
);

const sendMail = (email: string, content: Content) => {
  transporter.sendMail(
    {
      from: 'Tenure<xuan@tenurefi.com>',
      to: email,
      subject:
        content.type === 'welcome' ? SUBJECT_WELCOME : SUBJECT_RESET_PASSWORD,
      // @ts-expect-error/not-typescript-ready
      template: content.type,
      context: content.content,
    },
    (err) => {
      if (err) {
        throw new RouteError(HttpStatusCode.INTERNAL_SERVER_ERROR, err.message);
      }
    },
  );

  transporter.close();
};

export default {
  sendMail,
} as const;
