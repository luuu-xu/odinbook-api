const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Post = require('../models/Post');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const session = require('supertest-session');
const { initializeMongoServer, closeMongoServer, clearMongoServer } = require('./mongoConfigTesting.js');

// Create some test users
let mockUsers = [
  new User({
    name: 'Alice',
    username: 'alice@example.com',
    password: 'password123',
  }),
  new User({
    name: 'BobToBeDeleted',
    username: 'bob@example.com',
    password: 'password123',
  })
];

// Create a correct post by Alice
let mockPostData = {
  content: 'This is a test post',
  // user: mockUsers[0]._id,
};

beforeAll(async () => {
  await initializeMongoServer();
  // Save test users to database
  for (let mockUser of mockUsers) {
    bcrypt.hash(mockUser.password, 10, async (err, hashedPassword) => {
      if (err) {
        return next(err);
      }
      mockUser.password = hashedPassword;
      await mockUser.save();
    });
  }
});

afterAll(async () => {
  await clearMongoServer();
  // Close the mongoose connection after the tests are done
  await closeMongoServer();
});

describe('POST /api/authuser/posts', () => {
  let currentUser = mockUsers[0]; // Alice
  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    // Log in as Alice
    testSession = session(app);
    // await testSession.get('/protected').then(res => console.log(res.status));
    await testSession.post('/api/auth/login').send({
      username: currentUser.username,
      password: 'password123',
    });
    authenticatedSession = testSession;
    // await authenticatedSession.get('/protected').then(res => console.log(res.status));
  });

  it('should return 401 error if currentUser is not logged in', async () => {
    // Log out the currentUser
    await authenticatedSession.post('/api/auth/logout').expect(200);
    const res = await authenticatedSession
      .post('/api/authuser/posts')
      .send(mockPostData)
      .expect(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('should return 404 error if the currentUser is not found in database', async () => {
    // Log in as Bob
    await authenticatedSession.post('/api/auth/login').send({
      username: mockUsers[1].username,
      password: 'password123',
    });
    // Delete the Bob from the database
    await User.deleteOne({
      _id: mockUsers[1]._id,
    });
    const res = await authenticatedSession
      .post('/api/authuser/posts')
      .send(mockPostData)
      .expect(404);
    expect(res.body.message).toBe('User not found');
    // Add Bob back to the database
    await User.create({
      _id: mockUsers[1]._id,
      name: 'BobToBeDeleted',
      username: 'bob@example.com',
      password: mockUsers[1].password,
    });
  });

  it('should create and return a new post', async () => {
    const res = await authenticatedSession
      .post('/api/authuser/posts')
      .send(mockPostData)
      .expect(201);
    expect(res.body.post.content).toBe(mockPostData.content);
    expect(res.body.post.user).toBe(currentUser._id.toString());
  });

  it('should reject posts with unvalid content', async () => {
    const res = await authenticatedSession
      .post('/api/authuser/posts')
      .send({
        content: ' ',
      })
      .expect(400);
    expect(res.body.errors[0].param).toBe('content');
    expect(res.body.errors[0].msg).toBe('Content is required');
  });
});

describe.only('GET /api/authuser/posts', () => {
  let currentUser = mockUsers[0]; // Alice
  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    // Log in as Alice
    testSession = session(app);
    await testSession.post('/api/auth/login').send({
      username: currentUser.username,
      password: 'password123',
    });
    authenticatedSession = testSession;
  });

  it('should return 401 error if currentUser is not logged in', async () => {
    // Log out the currentUser
    await authenticatedSession.post('/api/auth/logout').expect(200);
    const res = await authenticatedSession
      .get('/api/authuser/posts')
      .expect(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('should return 404 error if the currentUser is not found in database', async () => {
    // Log in as Bob
    await authenticatedSession.post('/api/auth/login').send({
      username: mockUsers[1].username,
      password: 'password123',
    });
    // Delete the Bob from the database
    await User.deleteOne({
      _id: mockUsers[1]._id,
    });
    const res = await authenticatedSession
      .get('/api/authuser/posts')
      .expect(404);
    expect(res.body.message).toBe('User not found');
    // Add Bob back to the database
    await User.create({
      _id: mockUsers[1]._id,
      name: 'BobToBeDeleted',
      username: 'bob@example.com',
      password: mockUsers[1].password,
    })
  });

  it('should return a list of posts', async () => {
    // Create a post for currentUser
    await authenticatedSession
      .post('/api/authuser/posts')
      .send(mockPostData)
      .expect(201);
    let res = await authenticatedSession
      .get('/api/authuser/posts')
      .expect(200);
    expect(res.body.posts.length).toBe(1);
    expect(res.body.posts[0].content).toBe(mockPostData.content);

    // Create another post for currentUser
    await authenticatedSession
      .post('/api/authuser/posts')
      .send({ content: 'This is a test post 2' })
      .expect(201);
    res = await authenticatedSession
      .get('/api/authuser/posts')
      .expect(200);
    expect(res.body.posts.length).toBe(2);
    expect(res.body.posts[1].content).toBe('This is a test post 2');
  });
});
