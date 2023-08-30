import passport from 'passport';
import { BasicStrategy } from 'passport-http';

import EnvVars from '@src/constants/EnvVars';

interface User {
  name: string;
}

const basicAuthOptions: passport.AuthenticateOptions = {
  session: false,
};

passport.use(
  new BasicStrategy((username, password, done) => {
    if (username === EnvVars.BullUser && password === EnvVars.BullPassword) {
      return done(null, { name: 'admin' } as User);
    } else {
      return done(null, false);
    }
  }),
);

export const basicAuthMiddleware = passport.authenticate(
  'basic',
  basicAuthOptions,
);
