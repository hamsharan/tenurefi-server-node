import chai from 'chai';
import chaiHttp from 'chai-http';
import { sign } from 'jsonwebtoken';
import { describe, it } from 'mocha';
import { Response } from 'superagent';

import HttpStatusCode from '@src/constants/HttpStatusCode';
import app from '@src/server';

import prisma from '../helpers/prisma';

chai.use(chaiHttp);
const { expect } = chai;

const email = 'hasan@tenurefi.com';
const fakeTokenId = '57494ede-5da8-4cc9-8325-a1183513b313';
const password = '123456';
const refreshTokenId = 'fdff662d-b466-4b62-8397-30aa33a02681';
const refreshSecret = 'refreshsecret';
const refreshToken = 'refreshToken';
const userId = '1fb8cd91-40f1-419b-b9f9-a6873affe8ec';

const correctToken = sign({ userId, jti: refreshTokenId }, refreshSecret, { expiresIn: '8h' });
const wrongToken = sign({ userId, jti: fakeTokenId }, refreshSecret, { expiresIn: '8h' });

describe('AuthRouter', () => {
  let chaiHttpResponse: Response;

  describe('POST /auth/register', () => {
    it('should throw a validation error if an incorrect request body is provided', async () => {
      chaiHttpResponse = await chai.request(app).post('/api/auth/register').send({
        email,
      });

      const { status, body } = chaiHttpResponse;

      expect(status).to.equal(HttpStatusCode.BAD_REQUEST);
      expect(body).to.have.property('error');
    });

    it('should register a new user if no existing user with that email exists', async () => {
      chaiHttpResponse = await chai.request(app).post('/api/auth/register').send({
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

describe('POST /auth/refreshToken', () => {
  let chaiHttpResponse: Response;

  it('should throw a validation error if an incorrect request body is provided', async () => {
    chaiHttpResponse = await chai.request(app).post('/api/auth/refreshToken').send({
      token: refreshToken,
    });

    const { status, body } = chaiHttpResponse;

    expect(status).to.equal(HttpStatusCode.BAD_REQUEST);
    expect(body).to.have.property('error');
  });

  it('should throw a JsonWebTokerError if JWT is malformed', async () => {
    chaiHttpResponse = await chai.request(app).post('/api/auth/refreshToken').send({
      refreshToken,
    });

    const { status, body } = chaiHttpResponse;

    expect(status).to.equal(HttpStatusCode.BAD_REQUEST);
    expect(body).to.have.property('error');
  });

  it('should throw an error if refreshToken does not exist', async () => {
    chaiHttpResponse = await chai.request(app).post('/api/auth/refreshToken').send({
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

    chaiHttpResponse = await chai.request(app).post('/api/auth/refreshToken').send({
      refreshToken: correctToken,
    });

    const { status, body } = chaiHttpResponse;

    expect(status).to.equal(HttpStatusCode.UNAUTHORIZED);
    expect(body).to.have.property('error');
  });

  it('should throw an error if refreshToken hash is not the same as savedRefreshToken.hashedToken', async () => {
    const testToken = sign({ userId, jti: fakeTokenId }, refreshSecret, { expiresIn: '8h' });

    chaiHttpResponse = await chai.request(app).post('/api/auth/refreshToken').send({
      refreshToken: testToken,
    });

    const { status, body } = chaiHttpResponse;

    expect(status).to.equal(HttpStatusCode.UNAUTHORIZED);
    expect(body).to.have.property('error');
  });

  it('should throw an error if user does not exist in the db', async () => {
    const testToken = sign({ userId: 'fakeUserId', jti: refreshTokenId }, refreshSecret, { expiresIn: '8h' });

    chaiHttpResponse = await chai.request(app).post('/api/auth/refreshToken').send({
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
        revoked: false,
      },
    });

    chaiHttpResponse = await chai.request(app).post('/api/auth/refreshToken').send({
      refreshToken: correctToken,
    });

    const { status, body } = chaiHttpResponse;

    expect(status).to.equal(HttpStatusCode.OK);
    expect(body).to.have.property('accessToken');
    expect(body).to.have.property('refreshToken');
  });
});
