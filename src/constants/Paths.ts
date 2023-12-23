import { Immutable } from '@src/types/types';

const Paths = {
  Base: '/api',
  Auth: {
    Base: '/auth',
    Login: '/login',
    Logout: '/logout',
    Register: '/register',
    RefreshToken: '/refresh-token',
    ForgotPassword: '/forgot-password',
    ResetPassword: '/reset-password',
  },
  User: {
    Base: '/user',
    ChangePassword: '/change-password',
  },
  Company: {
    Base: '/company',
    Employee: '/employee',
  },
  SavingGoal: {
    Base: '/saving-goal',
    ID: '/:id',
    UserID: '/:userID',
  },
  Contribution: {
    Base: '/contribution',
    Gift: '/gift',
    GiftAll:'/giftAll'
  },
  ApiDocs: {
    Base: '/api-docs',
  },
  BullBoard: {
    Base: '/bull-board',
  },
  Notification: {
    Base: '/notification',
    Single: '/single',
    DeviceToken: '/device-token'
  }
};

export type TPaths = Immutable<typeof Paths>;
export default Paths as TPaths;
