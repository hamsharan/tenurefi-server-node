import { hashSync } from 'bcrypt';

import db from '@src/utils/db';

interface RegisterRequest {
  email: string;
  password: string;
}

const findUserByEmail = (email: string) => {
  return db.user.findUnique({
    where: {
      email,
    },
  });
};

const createUserByEmailAndPassword = (data: RegisterRequest) => {
  data.password = hashSync(data.password, 12);
  return db.user.create({
    data,
  });
};

const findUserById = (id: string | undefined) => {
  if (!id) {
    return null;
  }

  return db.user.findUnique({
    where: {
      id,
    },
  });
};

export default {
  findUserByEmail,
  createUserByEmailAndPassword,
  findUserById,
} as const;
