const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Post = require('../models/Post');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const session = require('supertest-session');
const { initializeMongoServer, closeMongoServer, clearMongoServer } = require('./mongoConfigTesting.js');

// Create some test users
let users = [
  new User({
    name: 'Alice',
    username: 'alice@example.com',
    password: 'password123',
  }),
  new User({
    name: 'Bob',
    username: 'bob@example.com',
    password: 'password123',
  }),
  new User({
    name: 'Charlie',
    username: 'charlie@example.com',
    password: 'password123',
  }),
];

beforeAll(async () => {
  await initializeMongoServer();
  // Save test users to database
  for (let user of users) {
    bcrypt.hash(user.password, 10, async (err, hashedPassword) => {
      if (err) {
        return next(err);
      }
      user.password = hashedPassword;
      await user.save();
    });
  }
  // await User.find().then(users => console.log('users server', users));
  // console.log('users local', users);
});

afterAll(async () => {
  await clearMongoServer();
  // Close the mongoose connection after the tests are done
  await closeMongoServer();
});

describe('GET /api/posts', () => {
  let currentUser = users[0]; // Alice
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

  it('should return 401 error if not logged in', async () => {
    // Log out the currentUser
    await authenticatedSession.post('/api/auth/logout').expect(200);
    const res = await authenticatedSession
      .get('/api/posts')
      .expect(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  // it('should return a list of all posts made by the currentUser', async () => {
  //   let res = await authenticatedSession
  //     .get('/api/posts')
  //     .expect(200);
  //   expect(res.body.length).toBe(0);
  //   // Add some posts
  //   const currentUserDB = await User.findById(currentUser._id);
  //   currentUserDB.posts.push(new Post({
  //     content: 'Content 1',
  //     user: currentUser._id,
  //   }));
  //   await currentUserDB.save();
  //   res = await authenticatedSession
  //     .get('/api/posts')
  //     .expect(200);
  //   expect(res.body.length).toBe(1);
  // });
});