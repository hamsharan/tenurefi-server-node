import chai from 'chai';
import chaiHttp from 'chai-http';
import { sign } from 'jsonwebtoken';
import { describe, it } from 'mocha';
import { Response } from 'superagent';
import { hashSync } from 'bcrypt';

import HttpStatusCode from '@src/constants/HttpStatusCode';
import app from '@src/server';

import prisma from '../helpers/prisma';
import { hashToken } from '@src/utils/jwt';

chai.use(chaiHttp);
const { expect } = chai;

const email = 'hasan@tenurefi.com';
const wrongEmail = 'hasan@.com';
const emailWithNoUser = 'xuan@tenurefi.com';
const fakeTokenId = '57494ede-5da8-4cc9-8325-a1183513b313';
const password = '123456';
const refreshTokenId = 'fdff662d-b466-4b62-8397-30aa33a02681';
const refreshSecret = 'test';
const refreshToken = 'refreshToken';
const userID = '1fb8cd91-40f1-419b-b9f9-a6873affe8ec';
const correctResetPasswordToken =
  '685116c7949e0a2a012915428cf49fd030d644b12166390fb6ee4456bae65fd3';
const hashedResetPasswordToken = hashSync(correctResetPasswordToken, 12);
const wrongResetPasswordToken =
  '55bb5baa2847462da7671724c0fe5f1f72f774a2ee09b5adc3c4eeda74fc161b';
const validDate = new Date(new Date().setHours(new Date().getHours() + 1));
const expiredDate = new Date(new Date().setHours(new Date().getHours() - 1));
const correctToken = sign({ userID, jti: refreshTokenId }, refreshSecret, {
  expiresIn: '8h',
});
const wrongToken = sign({ userID, jti: fakeTokenId }, refreshSecret, {
  expiresIn: '8h',
});
const hashedToken = hashToken(correctToken);

describe('AuthRouter', () => {
  let chaiHttpResponse: Response;

  describe('POST /auth/register', () => {
    it('should throw a validation error if an incorrect request body is provided', async () => {
      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/register')
        .send({
          email,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.BAD_REQUEST);
      expect(body).to.have.property('error');
    });

    it('should register a new user if no existing user with that email exists', async () => {
      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@test.com',
          password: 'test',
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.OK);
      expect(body).to.have.property('accessToken');
      expect(body).to.have.property('refreshToken');
    });
  });

  it('should not allow registration if a user already exists with provided email', async () => {
    chaiHttpResponse = await chai.request(app).post('/api/auth/register').send({
      email,
      password,
    });

    const { status, body } = chaiHttpResponse;

    expect(status).to.equal(HttpStatusCode.BAD_REQUEST);
    expect(body).to.have.property('error');
  });

  describe('POST /auth/login', () => {
    let chaiHttpResponse: Response;

    it('should throw a validation error if an incorrect request body is provided', async () => {
      chaiHttpResponse = await chai.request(app).post('/api/auth/login').send({
        email,
      });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.BAD_REQUEST);
      expect(body).to.have.property('error');
    });

    it('should throw an error if a user does not exist with provided email', async () => {
      chaiHttpResponse = await chai.request(app).post('/api/auth/login').send({
        email: 'hasan@tenure.com',
        password,
      });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.FORBIDDEN);
      expect(body).to.have.property('error');
    });

    it('should not allow a user to login if they provided incorrect credentials', async () => {
      chaiHttpResponse = await chai.request(app).post('/api/auth/login').send({
        email,
        password: '1234567',
      });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.FORBIDDEN);
      expect(body).to.have.property('error');
    });

    it('should allow a user to login if they provided their correct credentials', async () => {
      chaiHttpResponse = await chai.request(app).post('/api/auth/login').send({
        email,
        password,
      });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.OK);
      expect(body).to.have.property('accessToken');
      expect(body).to.have.property('refreshToken');
    });
  });

  describe('POST /auth/refresh-token', () => {
    let chaiHttpResponse: Response;

    it('should throw a validation error if an incorrect request body is provided', async () => {
      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/refresh-token')
        .send({
          token: refreshToken,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.BAD_REQUEST);
      expect(body).to.have.property('error');
    });

    it('should throw a JsonWebTokerError if JWT is malformed', async () => {
      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.BAD_REQUEST);
      expect(body).to.have.property('error');
    });

    it('should throw an error if refreshToken does not exist', async () => {
      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: wrongToken,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.UNAUTHORIZED);
      expect(body).to.have.property('error');
    });

    it('should throw an error if savedRefreshToken was revoked', async () => {
      await prisma.refreshToken.update({
        where: {
          id: refreshTokenId,
        },
        data: {
          revoked: true,
        },
      });

      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: correctToken,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.UNAUTHORIZED);
      expect(body).to.have.property('error');
    });

    it('should throw an error if refreshToken hash is not the same as savedRefreshToken.hashedToken', async () => {
      const testToken = sign({ userID, jti: fakeTokenId }, refreshSecret, {
        expiresIn: '8h',
      });

      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: testToken,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.UNAUTHORIZED);
      expect(body).to.have.property('error');
    });

    it('should throw an error if user does not exist in the db', async () => {
      const testToken = sign(
        { userID: 'fakeUserId', jti: refreshTokenId },
        refreshSecret,
        { expiresIn: '8h' },
      );

      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: testToken,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.UNAUTHORIZED);
      expect(body).to.have.property('error');
    });

    it('should return a new accessToken and refreshToken if all checks pass', async () => {
      await prisma.refreshToken.update({
        where: {
          id: refreshTokenId,
        },
        data: {
          hashedToken: hashedToken,
          revoked: false,
        },
      });

      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/refresh-token')
        .send({
          refreshToken: correctToken,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.OK);
      expect(body).to.have.property('accessToken');
      expect(body).to.have.property('refreshToken');
    });
  });

  describe('POST /auth/forgot-password', () => {
    let chaiHttpResponse: Response;

    it('should throw a validation error if an incorrect request body is provided', async () => {
      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: wrongEmail,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.BAD_REQUEST);
      expect(body).to.have.property('error');
    });

    it('should throw an error if the email does not associate with an existing user', async () => {
      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: emailWithNoUser,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.FORBIDDEN);
      expect(body).to.have.property('error');
    });

    it('should successfully initiate the reset password process', async () => {
      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/forgot-password')
        .send({
          email,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.OK);
      expect(body).to.be.empty;
    });
  });

  describe('POST /auth/reset-password', () => {
    let chaiHttpResponse: Response;

    it('should throw a validation error if an incorrect request body is provided', async () => {
      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/reset-password')
        .send({
          email,
          resetPasswordToken: correctResetPasswordToken,
          password,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.BAD_REQUEST);
      expect(body).to.have.property('error');
    });

    it('should throw an error if the a user is not associated with the userID', async () => {
      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/reset-password')
        .send({
          userID: fakeTokenId,
          resetPasswordToken: correctResetPasswordToken,
          password,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.FORBIDDEN);
      expect(body).to.have.property('error');
    });

    it('should throw an error if the user has not requested their password to be reset', async () => {
      await prisma.user.update({
        data: {
          resetPassword: null,
          resetPasswordAt: null,
        },
        where: {
          id: userID,
        },
      });

      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/reset-password')
        .send({
          userID,
          resetPasswordToken: correctResetPasswordToken,
          password,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.FORBIDDEN);
      expect(body).to.have.property('error');
    });

    it('should throw an error if the reset password token is incorret', async () => {
      await prisma.user.update({
        data: {
          resetPassword: hashedResetPasswordToken,
          resetPasswordAt: new Date().toISOString(),
        },
        where: {
          id: userID,
        },
      });

      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/reset-password')
        .send({
          userID,
          resetPasswordToken: wrongResetPasswordToken,
          password,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.FORBIDDEN);
      expect(body).to.have.property('error');
    });

    it('should throw an error if the reset password token has expired', async () => {
      await prisma.user.update({
        data: {
          resetPasswordAt: expiredDate.toISOString(),
        },
        where: {
          id: userID,
        },
      });

      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/reset-password')
        .send({
          userID,
          resetPasswordToken: correctResetPasswordToken,
          password,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.FORBIDDEN);
      expect(body).to.have.property('error');
    });

    it('should successfully reset the users password', async () => {
      await prisma.user.update({
        data: {
          resetPassword: hashedResetPasswordToken,
          resetPasswordAt: validDate.toISOString(),
        },
        where: {
          id: userID,
        },
      });

      chaiHttpResponse = await chai
        .request(app)
        .post('/api/auth/reset-password')
        .send({
          userID,
          resetPasswordToken: correctResetPasswordToken,
          password,
        });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.OK);
      expect(body).to.be.empty;
    });
  });
});
