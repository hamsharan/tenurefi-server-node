import { hashSync } from 'bcrypt';
import { randomBytes } from 'node:crypto';

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
  email = email.toLowerCase();
  return db.user.findUnique({
    where: {
      email,
    },
  });
};

const createUserByEmailAndPassword = (data: RegisterRequest) => {
  data.email = data.email.toLowerCase();
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

  if (data.email) {
    data.email = data.email.toLowerCase();
  }

  return db.user.update({
    data,
    where: {
      id,
    },
  });
};

const createResetPasswordToken = async (id: string) => {
  const resetPasswordToken = randomBytes(32).toString('hex');
  const hashedToken = hashSync(resetPasswordToken, 12);
  const expiryDate = new Date(new Date().setHours(new Date().getHours() + 1));
  await db.user.update({
    data: {
      resetPassword: hashedToken,
      resetPasswordAt: expiryDate.toISOString(),
    },
    where: {
      id,
    },
  });
  return resetPasswordToken;
};

const deleteResetPasswordToken = async (id: string) => {
  return db.user.update({
    data: {
      resetPassword: null,
      resetPasswordAt: null,
    },
    where: {
      id,
    },
  });
};

const resetPassword = (password: string, id: string) => {
  password = hashSync(password, 12);

  return db.user.update({
    data: {
      password: password,
      resetPassword: null,
      resetPasswordAt: null,
    },
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
  createResetPasswordToken,
  deleteResetPasswordToken,
  resetPassword,
} as const;
