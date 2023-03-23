const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const mongoose = require('mongoose');
const { initializeMongoServer, closeMongoServer, clearMongoServer } = require('./mongoConfigTesting.js');

// Create some test users
let users = [
  new User({
    name: 'Alice',
    username: 'alice@example.com',
    password: 'password123'
  }),
  new User({
    name: 'Bob',
    username: 'bob@example.com',
    password: 'password123'
  }),
  new User({
    name: 'Charlie',
    username: 'charlie@example.com',
    password: 'password123'
  }),
];

beforeAll(async () => {
  await initializeMongoServer();
  // Save test users to database
  for (let user of users) {
    await user.save();
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
// describe('POST /users/:userId/send-friend-request', () => {
//   let currentUser;
//   let userToSendRequestTo;

//   beforeEach(async () => {
//     // Create two test users
//     currentUser = await User.create({
//       name: 'Alice',
//       email: 'alice@example.com',
//       password: 'password123'
//     });
//     userToSendRequestTo = await User.create({
//       name: 'Bob',
//       email: 'bob@example.com',
//       password: 'password123'
//     });
//   });

//   afterEach(async () => {
//     // Remove the test users after each test
//     await currentUser.remove();
//     await userToSendRequestTo.remove();
//   });

//   it('should send a friend request from the current user to the specified user', async () => {
//     const res = await request(app)
//       .post(`/users/${userToSendRequestTo._id}/send-friend-request`)
//       .set('Authorization', `Bearer ${currentUser.generateAuthToken()}`)
//       .expect(200);

//     // Check that the friend request was sent successfully
//     expect(res.body.currentUser.friend_requests_sent).toContainEqual(userToSendRequestTo._id);
//     expect(res.body.userToSendRequestTo.friend_requests_received).toContainEqual(currentUser._id);
//   });

//   it('should return a 404 error if the current user is not found', async () => {
//     const res = await request(app)
//       .post(`/users/${userToSendRequestTo._id}/send-friend-request`)
//       .set('Authorization', `Bearer invalid_token`)
//       .expect(404);

//     expect(res.body.message).toBe('User not found');
//   });

//   it('should return a 404 error if the user to send the friend request to is not found', async () => {
//     const res = await request(app)
//       .post('/users/invalid_id/send-friend-request')
//       .set('Authorization', `Bearer ${currentUser.generateAuthToken()}`)
//       .expect(404);

//     expect(res.body.message).toBe('User not found');
//   });

//   it('should return a 400 error if a friend request has already been sent', async () => {
//     // Add the user to send the request to to the current user's friend requests sent array
//     currentUser.friend_requests_sent.push(userToSendRequestTo._id);
//     await currentUser.save();

//     const res = await request(app)
//       .post(`/users/${userToSendRequestTo._id}/send-friend-request`)
//       .set('Authorization', `Bearer ${currentUser.generateAuthToken()}`)
//       .expect(400);

//     expect(res.body.message).toBe('Friend request already sent');
//   });

//   it('should return a 400 error if the users are already friends', async () => {
//     // Add the user to send the request to to the current user's friends array
//     currentUser.friends.push(userToSendRequestTo._id);
//     await currentUser.save();

//     const res = await request(app)
//       .post(`/users/${userToSendRequestTo._id}/send-friend-request`)
//       .set('Authorization', `Bearer ${currentUser.generateAuthToken()}`)
//       .expect(400);

//     expect(res.body.message).toBe('Already friends');
//   });
// });