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

// POST /users/:userId/send-friend-request
describe('POST /api/users/send-friend-request/:userId', () => {
  let currentUser = users[0]; // Alice
  let userToSendRequestTo = users[1]; // Bob

  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    // Sign in Alice
    testSession = session(app);
    await testSession
      .post('/api/auth/login')
      .send({
        username: 'alice@example.com',
        password: 'password123',
      })
      .expect(200);
    authenticatedSession = testSession;
  });

  it('should return a 401 error if the user is not logged in', async () => {
    await authenticatedSession.post('/api/auth/logout').expect(200);
    const res = await authenticatedSession
      .post(`/api/users/send-friend-request/${userToSendRequestTo._id}`)
      .expect(401);
  });

  it('should send a friend request from the currentUser to the specified user', async () => {
    const res = await authenticatedSession
      .post(`/api/users/send-friend-request/${userToSendRequestTo._id}`)
      .expect(200);

    // Check that the friend request was sent successfully
    expect(res.body.currentUser.friend_requests_sent).toContainEqual(userToSendRequestTo._id);
    expect(res.body.userToSendRequestTo.friend_requests_received).toContainEqual(currentUser._id);
  });

  it('should return a 404 error if the currentUser is not found', async () => {
    // Delete alice from DB
    await User.findByIdAndDelete(currentUser._id);
    const res = await authenticatedSession
      .post(`/api/users/send-friend-request/${userToSendRequestTo._id}`)
      .expect(404);

    expect(res.body.message).toBe('User not found');
    // Sign up Alice again
    await authenticatedSession
      .post('/api/auth/signup')
      .send({
        name: 'Alice',
        username: 'alice@example.com',
        password: 'password123',
      })
      .then(res => {
        users[0]._id = res.body._id;
      });
  });

  it('should return a 404 error if the userToSendRequestTo is not found', async () => {
    const res = await authenticatedSession
      .post(`/api/users/send-friend-request/${new mongoose.Types.ObjectId()}`)
      .expect(404);

    expect(res.body.message).toBe('User not found');
  });

  it('should return a 400 error if a friend request has already been sent', async () => {
    // Add the userToSendRequestTo to the currentUser's friend requests sent array
    const currentUserDB = await User.findById(currentUser._id);
    currentUserDB.friend_requests_sent.push(userToSendRequestTo._id);
    await currentUserDB.save();

    const res = await authenticatedSession
      .post(`/api/users/send-friend-request/${userToSendRequestTo._id}`)
      .expect(400);

    expect(res.body.message).toBe('Friend request already sent');
    // Delete the friend_requests_sent for alice
    currentUserDB.friend_requests_sent.pop(userToSendRequestTo._id);
    await currentUserDB.save();
  });

  it('should return a 400 error if the users are already friends', async () => {
    // Add the userToSendRequestTo to the currentUser's friends array
    const currentUserDB = await User.findById(currentUser._id);
    currentUserDB.friends.push(userToSendRequestTo._id);
    await currentUserDB.save();

    const res = await authenticatedSession
      .post(`/api/users/send-friend-request/${userToSendRequestTo._id}`)
      .expect(400);

    expect(res.body.message).toBe('Already friends');
  });
});

describe('POST /api/users/accept-friend-request/:userid', () => {
  let currentUser = users[0]; // Alice
  let userFriendRequestFrom = users[1]; // Bob

  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    clearMongoServer();
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
    // Sign in Bob and Bob sends friend request to Alice
    await testSession
      .post('/api/auth/login')
      .send({
        username: 'bob@example.com',
        password: 'password123',
      });
    authenticatedSession = testSession;
    await authenticatedSession
      .post(`/api/users/send-friend-request/${currentUser._id}`);
    // Now sign in Alice
    await authenticatedSession
      .post('/api/auth/login')
      .send({
        username: 'alice@example.com',
        password: 'password123',
      });
  });

  it('should return a 401 error if the user is not logged in', async () => {
    await authenticatedSession.post('/api/auth/logout').expect(200);
    const res = await authenticatedSession
      .post(`/api/users/accept-friend-request/${userFriendRequestFrom._id}`)
      .expect(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('should accept a friend request from the currentUser', async () => {
    const res = await authenticatedSession
      .post(`/api/users/accept-friend-request/${userFriendRequestFrom._id}`)
      .expect(200);
    
    expect(res.body.message).toBe('Friend request accepted');
    expect(res.body.currentUser.friends)
    .toContainEqual(userFriendRequestFrom._id)
    expect(res.body.currentUser.friend_requests_received)
    .not.toContainEqual(userFriendRequestFrom._id)
    expect(res.body.userFriendRequestFrom.friends)
    .toContainEqual(currentUser._id)
    expect(res.body.userFriendRequestFrom.friend_requests_sent)
    .not.toContainEqual(currentUser._id);
  });

  it('should return a 404 error if the currentUser is not found', async () => {
    // Delete alice from DB
    await User.findByIdAndDelete(currentUser._id);
    const res = await authenticatedSession
      .post(`/api/users/accept-friend-request/${userFriendRequestFrom._id}`)
      .expect(404);
    expect(res.body.message).toBe('User not found');
  });

  it('should return a 404 error if the userFriendRequestFrom is not found', async () => {
    // Delete Bob from DB
    await User.findByIdAndDelete(userFriendRequestFrom._id);
    const res = await authenticatedSession
      .post(`/api/users/accept-friend-request/${userFriendRequestFrom._id}`)
      .expect(404);
    expect(res.body.message).toBe('User not found');
  });

  it('should return a 400 error if the user is already a friend', async () => {
    // Add Bob to currentUser's friends array
    const currentUserDB = await User.findById(currentUser._id);
    currentUserDB.friends.push(userFriendRequestFrom._id);
    await currentUserDB.save();

    const res = await authenticatedSession
      .post(`/api/users/accept-friend-request/${userFriendRequestFrom._id}`)
      .expect(400);
    expect(res.body.message).toBe('Already friends');
  });
});

describe('GET /api/users/:userid/friends', () => {
  let currentUser = users[0]; // Alice
  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    clearMongoServer();
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
    expect(res.body).toHaveLength(0);
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
    expect(res.body).toHaveLength(1);
    console.log(res.body);
    expect(res.body[0]).toBe(bob._id);

    // Add Charlie to currentUser's friends array
    let charlie = users[2];
    currentUserDB.friends.push(charlie._id);
    await currentUserDB.save();
    res = await authenticatedSession
      .get(`/api/users/${currentUser._id}/friends`)
      .expect(200);
    expect(res.body).toHaveLength(2);
    expect(res.body).toContainEqual(bob._id);
    expect(res.body).toContainEqual(charlie._id);
  });
});