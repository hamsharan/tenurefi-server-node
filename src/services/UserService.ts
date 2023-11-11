import { hashSync } from 'bcrypt';

import db from '@src/utils/db';

interface RegisterRequest {
  email: string;
  password: string;
}

interface UpdateRequest {
  email?: string;
  password?: string;
  name?: string;
  dob?: Date;
  location?: string;
  companyRole?: string;
  companyID?: bigint;
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

const updateUser = (data: UpdateRequest, id: string) => {
  if (data.password) {
    data.password = hashSync(data.password, 12);
  }

  return db.user.update({
    data,
    where: {
      id,
    },
  });
};

export default {
  findUserByEmail,
  createUserByEmailAndPassword,
  findUserById,
  updateUser,
} as const;
