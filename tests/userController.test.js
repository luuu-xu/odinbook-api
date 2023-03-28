const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const mongoose = require('mongoose');
const session = require('supertest-session');
const { initializeMongoServer, closeMongoServer, clearMongoServer } = require('./mongoConfigTesting.js');

// Create some test users
let users = [
  {
    name: 'Alice',
    username: 'alice@example.com',
    password: 'password123'
  },
  {
    name: 'Bob',
    username: 'bob@example.com',
    password: 'password123'
  },
  {
    name: 'Charlie',
    username: 'charlie@example.com',
    password: 'password123'
  },
];

beforeAll(async () => {
  await initializeMongoServer();
  // Save test users to database
  for (let user of users) {
    // await user.save();
    await request(app)
      .post('/api/auth/signup')
      .send(user)
      .expect(201)
      .then(res => {
        user._id = res.body._id;
        // console.log(user);
      });
  }
});

afterAll(async () => {
  await clearMongoServer();
  // Close the mongoose connection after the tests are done
  await closeMongoServer();
});

describe('GET /api/users', () => {
  it('should return a list of all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .expect(200);

    // Check that the response body contains all of the test users
    expect(res.body).toHaveLength(users.length);
    expect(res.body[0].name).toBe('Alice');
    expect(res.body[1].name).toBe('Bob');
    expect(res.body[2].name).toBe('Charlie');
  });
});

describe('GET /api/users/:userid', () => {
  it('should return a single user', async () => {
    const res = await request(app)
      .get('/api/users/' + users[0]._id)
      .expect(200);
    
    // Check that the response body contains the test user
    expect(res.body.name).toBe('Alice');
  });

  it('should return a 404 if the user is not found', async () => {
    const res = await request(app)
      .get('/api/users/' + new mongoose.Types.ObjectId())
      .expect(404);
  });
});

describe('GET /api/users/:userid/friends', () => {
  let currentUser = users[0]; // Alice
  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    await clearMongoServer();
    testSession = session(app);
    // Save test users to database
    for (let user of users) {
      await testSession
        .post('/api/auth/signup')
        .send({
          name: user.name,
          username: user.username,
          password: user.password,
        })
        .then(res => {
          user._id = res.body._id;
        });
    }
    // Sign in Alice
    await testSession
      .post('/api/auth/login')
      .send({
        username: 'alice@example.com',
        password: 'password123',
      });
    authenticatedSession = testSession;
  });

  it('should return a empty array if the user friends array is empty', async () => {
    const res = await authenticatedSession
      .get(`/api/users/${currentUser._id}/friends`)
      .expect(200);
    expect(res.body.friends).toHaveLength(0);
  });

  it('should return a 404 error if the user is not found', async () => {
    const res = await authenticatedSession
      .get(`/api/users/${new mongoose.Types.ObjectId()}/friends`)
      .expect(404);
    expect(res.body.message).toBe('User not found');
  });

  it('should return a list of friends', async () => {
    // Add Bob to currentUser's friends array
    let bob = users[1];
    const currentUserDB = await User.findById(currentUser._id);
    currentUserDB.friends.push(bob._id);
    await currentUserDB.save();
    let res = await authenticatedSession
      .get(`/api/users/${currentUser._id}/friends`)
      .expect(200);
    expect(res.body.friends).toHaveLength(1);
    expect(res.body.friends[0].name).toBe(bob.name);

    // Add Charlie to currentUser's friends array
    let charlie = users[2];
    currentUserDB.friends.push(charlie._id);
    await currentUserDB.save();
    res = await authenticatedSession
      .get(`/api/users/${currentUser._id}/friends`)
      .expect(200);
    expect(res.body.friends).toHaveLength(2);
    expect(res.body.friends[0].name).toBe(bob.name);
    expect(res.body.friends[1].name).toBe(charlie.name);
  });
});

describe('GET /api/users/:userid/posts', () => {
  let currentUser = users[0]; // Alice
  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    await clearMongoServer();
    testSession = session(app);
    // Save test users to database
    for (let user of users) {
      await testSession
        .post('/api/auth/signup')
        .send({
          name: user.name,
          username: user.username,
          password: user.password,
        })
        .then(res => {
          user._id = res.body._id;
        });
    }
    // Sign in Alice
    await testSession
      .post('/api/auth/login')
      .send({
        username: 'alice@example.com',
        password: 'password123',
      });
    authenticatedSession = testSession;
  });

  it('should return a empty array if the user posts array is empty', async () => {
    const res = await authenticatedSession
      .get(`/api/users/${currentUser._id}/posts`)
      .expect(200);
    expect(res.body.posts).toHaveLength(0);
  });

  it('should return 404 error if the user is not found', async () => {
    const res = await authenticatedSession
      .get(`/api/users/${new mongoose.Types.ObjectId()}/posts`)
      .expect(404);
    expect(res.body.message).toBe('User not found');
  });

  it('should return a list of posts', async () => {
    // Post some posts to database
    await authenticatedSession
      .post('/api/authuser/posts')
      .send({ content: 'This is a test post' })
      .expect(201);
    let res = await authenticatedSession
      .get(`/api/users/${currentUser._id}/posts`)
      .expect(200);
    expect(res.body.posts).toHaveLength(1);
    expect(res.body.posts[0].user.name).toBe(currentUser.name);
    expect(res.body.posts[0].content).toBe('This is a test post');
    // Post another post to database
    await authenticatedSession
      .post('/api/authuser/posts')
      .send({ content: 'This is another test post' })
      .expect(201);
    res = await authenticatedSession
      .get(`/api/users/${currentUser._id}/posts`)
      .expect(200);
    expect(res.body.posts).toHaveLength(2);
    expect(res.body.posts[1].content).toBe('This is another test post');
  });
});