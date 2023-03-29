const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
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

async function addMockUsersToDB() {
  for (let mockUser of mockUsers) {
    // await mockUser.save();
    await User.create({
      name: mockUser.name,
      username: mockUser.username,
      password: mockUser.password,
      _id: mockUser._id,
    });
  }
}

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

describe('GET /api/users', () => {
  it('should return an empty list if no users are found', async () => {
    // Delete all users
    await User.deleteMany({});
    const res = await request(app)
      .get('/api/users')
      .expect(200);
    expect(res.body.users).toHaveLength(0);
    // Add users back to DB
    await addMockUsersToDB();
  });

  it('should return a list of all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .expect(200);
    // Check that the response body contains all of the test users
    expect(res.body.users).toHaveLength(mockUsers.length);
    expect(res.body.users).toContainEqual(expect.objectContaining({ name: 'Alice' }));
    expect(res.body.users).toContainEqual(expect.objectContaining({ name: 'Bob' }));
    expect(res.body.users).toContainEqual(expect.objectContaining({ name: 'Charlie' }));
  });
});

describe('GET /api/users/:userid', () => {
  it('should return a single user', async () => {
    const res = await request(app)
      .get('/api/users/' + mockUsers[0]._id)
      .expect(200);
    expect(res.body.user.name).toBe('Alice');
  });

  it('should return a 404 if the user is not found', async () => {
    const res = await request(app)
      .get('/api/users/' + new mongoose.Types.ObjectId())
      .expect(404);
    expect(res.body.message).toBe('User not found');
  });
});

describe('GET /api/users/:userid/friends', () => {
  let currentUser = mockUsers[0]; // Alice
  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    // Clear the database and all Users into it
    await clearMongoServer();
    await addMockUsersToDB();
    testSession = session(app);
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
    const bob = mockUsers[1];
    currentUser.friends.push(bob._id);
    await currentUser.save();
    let res = await authenticatedSession
      .get(`/api/users/${currentUser._id}/friends`)
      .expect(200);
    expect(res.body.friends).toHaveLength(1);
    expect(res.body.friends).toContainEqual(expect.objectContaining({ name: 'Bob' }));

    // Add Charlie to currentUser's friends array
    const charlie = mockUsers[2];
    currentUser.friends.push(charlie._id);
    await currentUser.save();
    res = await authenticatedSession
      .get(`/api/users/${currentUser._id}/friends`)
      .expect(200);
    expect(res.body.friends).toHaveLength(2);
    expect(res.body.friends).toContainEqual(expect.objectContaining({ name: 'Bob' }));
    expect(res.body.friends).toContainEqual(expect.objectContaining({ name: 'Charlie' }));
  });
});

describe('GET /api/users/:userid/posts', () => {
  let currentUser = mockUsers[0]; // Alice
  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    // Clear the database and all Users into it
    await clearMongoServer();
    await addMockUsersToDB();
    testSession = session(app);
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
    expect(res.body.posts).toContainEqual(
      expect.objectContaining({ user: expect.objectContaining({ name: currentUser.name }) })
    );
    expect(res.body.posts).toContainEqual(expect.objectContaining({ content: 'This is a test post' }));
    // Post another post to database
    await authenticatedSession
      .post('/api/authuser/posts')
      .send({ content: 'This is another test post' })
      .expect(201);
    res = await authenticatedSession
      .get(`/api/users/${currentUser._id}/posts`)
      .expect(200);
    expect(res.body.posts).toHaveLength(2);
    expect(res.body.posts).toContainEqual(expect.objectContaining({ content: 'This is another test post' }));
  });
});