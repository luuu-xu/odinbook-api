const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const session = require('supertest-session');
const { initializeMongoServer, closeMongoServer, clearMongoServer } = require('./mongoConfigTesting.js');

beforeAll(async () => {
  await initializeMongoServer();
  // Save test users to database
  // await user.save();
  await request(app)
    .post('/api/auth/signup')
    .send({
      name: 'Alice',
      username: 'alice@example.com',
      password: 'password123'
    })
    .expect(201);
});

afterAll(async () => {
  await clearMongoServer();
  // Close the mongoose connection after the tests are done
  await closeMongoServer();
});

let testSession = null;

beforeEach(async () => {
  testSession = session(app);
});

// afterEach(async () => {
//   // await testSession.post('/api/auth/logout').expect(200);
//   testSession = null;
// });

describe('POST /api/auth/signup', () => {
  let authenticatedSession;

  it('should create a new user and log in', async () => {
    await testSession.get('/protected').expect(401);
    const res = await testSession
      .post('/api/auth/signup')
      .send({
        name: 'Dave',
        username: 'dave@example.com',
        password: 'password123',
      })
      .expect(201);
    User.findOne({ username: 'dave@example.com' })
    .then(user => {
      expect(user.name).toBe('Dave');
    });
    await testSession.post('/api/auth/login').send({
      username: 'dave@example.com',
      password: 'password123'
    }).expect(200);
    authenticatedSession = testSession;
    await authenticatedSession.get('/protected').expect(200);
  });

  it('should reject users with duplicate usernames', async () => {
    const res = await testSession
      .post('/api/auth/signup')
      .send({
        name: 'Dave',
        username: 'dave@example.com',
        password: 'password123',
      })
      .expect(400);
  });
  
});

describe('POST /api/auth/login', () => {
  let authenticatedSession;

  it('should log in existing user and return a session token', async () => {
    await testSession.get('/protected').expect(401);
    const res = await testSession
      .post('/api/auth/login')
      .send({
        username: 'alice@example.com',
        password: 'password123'
      })
      .expect(200);
    authenticatedSession = testSession;
    await authenticatedSession.get('/protected').expect(200);
  });

  it('should reject users with incorrect password', async () => {
    await testSession.get('/protected').expect(401);
    const res = await testSession
      .post('/api/auth/login')
      .send({
        username: 'alice@example.com',
        password: 'incorrectPassword',
      })
      .expect(401);
    authenticatedSession = testSession;
    await authenticatedSession.get('/protected').expect(401);
  });

  it('should reject users with incorrect username', async () => {
    await testSession.get('/protected').expect(401);
    const res = await testSession
      .post('/api/auth/login')
      .send({
        username: 'incorrectUsername',
        password: 'password123',
      })
      .expect(401);
    authenticatedSession = testSession;
    await authenticatedSession.get('/protected').expect(401);
  });
});

describe('POST /api/auth/logout', () => {
  let authenticatedSession;

  it('should log out existing user', async () => {
    await testSession.get('/protected').expect(401);
    const res = await testSession
      .post('/api/auth/login')
      .send({
        username: 'alice@example.com',
        password: 'password123',
      })
      .expect(200);
    authenticatedSession = testSession;
    await authenticatedSession.get('/protected').expect(200);
    await authenticatedSession.post('/api/auth/logout').expect(200);
    await authenticatedSession.get('/protected').expect(401);
  })
})