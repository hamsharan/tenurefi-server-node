import { Immutable } from '@src/types/types';

const Paths = {
  Base: '/api',
  Auth: {
    Base: '/auth',
    Login: '/login',
    Logout: '/logout',
    Register: '/register',
    RefreshToken: '/refresh-token',
  },
  Company: {
    Base: '/company',
    Employee: '/employee',
  },
  ApiDocs: {
    Base: '/api-docs',
  },
  BullBoard: {
    Base: '/bull-board',
  },
};

export type TPaths = Immutable<typeof Paths>;
export default Paths as TPaths;
