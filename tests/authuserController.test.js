const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
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
    name: 'Bob',
    username: 'bob@example.com',
    password: 'password123',
  })
];

let mockPostData = {
  content: 'This is a test post',
};

let mockCommentData = {
  content: 'This is a test comment',
}

beforeAll(async () => {
  await initializeMongoServer();
  // Save mock users to database
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
      name: 'Bob',
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

describe('GET /api/authuser/posts', () => {
  let currentUser = mockUsers[0]; // Alice
  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    // Clear Post collection
    await Post.deleteMany({});
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
      name: 'Bob',
      username: 'bob@example.com',
      password: mockUsers[1].password,
    });
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

describe('POST /api/authuser/send-friend-request/:userid', () => {
  let currentUser = mockUsers[0]; // Alice
  let userToSendRequestTo = mockUsers[1]; // Bob

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
      .post(`/api/authuser/send-friend-request/${userToSendRequestTo._id}`)
      .expect(401);
  });

  it('should send a friend request from the currentUser to the specified user', async () => {
    const res = await authenticatedSession
      .post(`/api/authuser/send-friend-request/${userToSendRequestTo._id}`)
      .expect(200);
    // Check that the friend request was sent successfully
    expect(res.body.currentUser.friend_requests_sent).toContainEqual(userToSendRequestTo._id.toString());
    expect(res.body.userToSendRequestTo.friend_requests_received).toContainEqual(currentUser._id.toString());
  });

  it('should return a 404 error if the currentUser is not found', async () => {
    // Delete alice from DB
    await User.findByIdAndDelete(currentUser._id);
    const res = await authenticatedSession
      .post(`/api/authuser/send-friend-request/${userToSendRequestTo._id}`)
      .expect(404);
    expect(res.body.message).toBe('User not found');
    // Add Alice back to the database
    await User.create({
      _id: mockUsers[0]._id,
      name: 'Alice',
      username: 'alice@example.com',
      password: mockUsers[0].password,
    });
  });

  it('should return a 404 error if the userToSendRequestTo is not found', async () => {
    const res = await authenticatedSession
      .post(`/api/authuser/send-friend-request/${new mongoose.Types.ObjectId()}`)
      .expect(404);
    expect(res.body.message).toBe('User not found');
  });

  it('should return a 400 error if a friend request has already been sent', async () => {
    // Add the userToSendRequestTo to the currentUser's friend requests sent array
    const currentUserDB = await User.findById(currentUser._id);
    currentUserDB.friend_requests_sent.push(userToSendRequestTo._id);
    await currentUserDB.save();

    const res = await authenticatedSession
      .post(`/api/authuser/send-friend-request/${userToSendRequestTo._id}`)
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
      .post(`/api/authuser/send-friend-request/${userToSendRequestTo._id}`)
      .expect(400);

    expect(res.body.message).toBe('Already friends');
  });
});

describe('POST /api/authuser/accept-friend-request/:userid', () => {
  let currentUser = mockUsers[0]; // Alice
  let userFriendRequestFrom = mockUsers[1]; // Bob

  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    // Clear up the database and add Alice and Bob into the database
    await User.deleteMany({});
    for (let user of mockUsers) {
      await User.create({
        _id: user._id,
        name: user.name,
        username: user.username,
        password: user.password,
      });
    }
    testSession = session(app);
    // Sign in Bob and Bob sends friend request to Alice
    await testSession
      .post('/api/auth/login')
      .send({
        username: 'bob@example.com',
        password: 'password123',
      });
    authenticatedSession = testSession;
    await authenticatedSession
      .post(`/api/authuser/send-friend-request/${currentUser._id}`);
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
      .post(`/api/authuser/accept-friend-request/${userFriendRequestFrom._id}`)
      .expect(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('should accept a friend request from the currentUser', async () => {
    const res = await authenticatedSession
      .post(`/api/authuser/accept-friend-request/${userFriendRequestFrom._id}`)
      .expect(200);
    
    expect(res.body.message).toBe('Friend request accepted');
    expect(res.body.currentUser.friends)
    .toContainEqual(userFriendRequestFrom._id.toString())
    expect(res.body.currentUser.friend_requests_received)
    .not.toContainEqual(userFriendRequestFrom._id.toString())
    expect(res.body.userFriendRequestFrom.friends)
    .toContainEqual(currentUser._id.toString())
    expect(res.body.userFriendRequestFrom.friend_requests_sent)
    .not.toContainEqual(currentUser._id.toString());
  });

  it('should return a 404 error if the currentUser is not found', async () => {
    // Delete alice from DB
    await User.findByIdAndDelete(currentUser._id);
    const res = await authenticatedSession
      .post(`/api/authuser/accept-friend-request/${userFriendRequestFrom._id}`)
      .expect(404);
    expect(res.body.message).toBe('User not found');
  });

  it('should return a 404 error if the userFriendRequestFrom is not found', async () => {
    // Delete Bob from DB
    await User.findByIdAndDelete(userFriendRequestFrom._id);
    const res = await authenticatedSession
      .post(`/api/authuser/accept-friend-request/${userFriendRequestFrom._id}`)
      .expect(404);
    expect(res.body.message).toBe('User not found');
  });

  it('should return a 400 error if the user is already a friend', async () => {
    // Add Bob to currentUser's friends array
    const currentUserDB = await User.findById(currentUser._id);
    currentUserDB.friends.push(userFriendRequestFrom._id);
    await currentUserDB.save();

    const res = await authenticatedSession
      .post(`/api/authuser/accept-friend-request/${userFriendRequestFrom._id}`)
      .expect(400);
    expect(res.body.message).toBe('Already friends');
  });
});

describe('POST /api/authuser/posts/:postid/give-like', () => {
  let currentUser = mockUsers[0]; // Alice
  let mockPost = mockPostData;
  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    // Clear up the database and add Alice and Bob into the database
    await User.deleteMany({});
    await Post.deleteMany({});
    for (let user of mockUsers) {
      await User.create({
        _id: user._id,
        name: user.name,
        username: user.username,
        password: user.password,
      });
    }
    // Log in as Alice
    testSession = session(app);
    await testSession.post('/api/auth/login').send({
      username: currentUser.username,
      password: 'password123',
    });
    authenticatedSession = testSession;
    // Alice posts a post
    await authenticatedSession
      .post('/api/authuser/posts')
      .send(mockPostData)
      .then(res => {
        mockPost._id = res.body.post._id;
      });
  });

  it('should return a 401 error if the user is not logged in', async () => {
    await authenticatedSession.post('/api/auth/logout').expect(200);
    const res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/give-like`)
      .expect(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('should return a 404 error if the authuser is not found', async () => {
    // Delete Alice from DB
    await User.findByIdAndDelete(currentUser._id);
    const res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/give-like`)
      .expect(404);
    expect(res.body.message).toBe('User not found');
  });

  it('should return a 404 error if the post is not found', async () => {
    // Delete mockPost from DB
    await Post.findByIdAndDelete(mockPost._id);
    const res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/give-like`)
      .expect(404);
    expect(res.body.message).toBe('Post not found');
  });

  it('should add the currentUser to the post\'s likes array', async () => {
    const res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/give-like`)
      .expect(200);
    expect(res.body.message).toBe('Like added');
    expect(res.body.post.likes).toContainEqual(currentUser._id.toString());
  });

  it('should return a 400 error if the post is already liked by the currentUser', async () => {
    let res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/give-like`)
      .expect(200);
    expect(res.body.post.likes).toContainEqual(currentUser._id.toString());
    res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/give-like`)
      .expect(400);
    expect(res.body.message).toBe('Already liked');
  });
});

describe('POST /api/authuser/posts/:postid/comments', () => {
  let currentUser = mockUsers[0]; // Alice
  let mockPost = mockPostData;
  let mockComment = mockCommentData;
  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    // Clear up the database and add Alice and Bob into the database
    await User.deleteMany({});
    await Post.deleteMany({});
    for (let user of mockUsers) {
      await User.create({
        _id: user._id,
        name: user.name,
        username: user.username,
        password: user.password,
      });
    }
    // Log in as Alice
    testSession = session(app);
    await testSession.post('/api/auth/login').send({
      username: currentUser.username,
      password: 'password123',
    });
    authenticatedSession = testSession;
    // Alice posts a post
    await authenticatedSession
      .post('/api/authuser/posts')
      .send(mockPostData)
      .then(res => {
        mockPost._id = res.body.post._id;
      });
  });

  it('should return a 401 error if the user is not logged in', async () => {
    await authenticatedSession.post('/api/auth/logout').expect(200);
    const res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/comments`)
      .expect(401);
    expect(res.body.message).toBe('Unauthorized');
  });

  it('should return a 404 error if the user is not found', async () => {
    // Delete Alice from DB
    await User.findByIdAndDelete(currentUser._id);
    const res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/comments`)
      .expect(404);
    expect(res.body.message).toBe('User not found');
  });

  it('should return a 404 error if the post is not found', async () => {
    // Delete mockPost from DB
    await Post.findByIdAndDelete(mockPost._id);
    const res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/comments`)
      .expect(404);
    expect(res.body.message).toBe('Post not found');
  });

  it('should post a comment', async () => {
    let res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/comments`)
      .send(mockCommentData)
      .expect(201);
    mockComment._id = res.body.comment._id;
    expect(res.body.comment.content).toBe(mockComment.content);
    expect(res.body.comment._id).toBe(mockComment._id.toString());
    expect(res.body.post._id).toBe(mockPost._id.toString());
    // Log in as Bob and Bob posts a comment to the post
    await authenticatedSession.post(`/api/auth/login`).send({
      username: 'bob@example.com',
      password: 'password123',
    });
    res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/comments`)
      .send({ content: 'This is a comment by Bob' })
      .expect(201);
    expect(res.body.comment.content).toBe('This is a comment by Bob');
    expect(res.body.comment.user).toBe(mockUsers[1]._id.toString());
    expect(res.body.post._id).toBe(mockPost._id.toString());
    expect(res.body.post.comments).toHaveLength(2);
  });

  it('should reject comment with invalid content', async () => {
    const res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/comments`)
      .send({ content: ' ' })
      .expect(400);
    expect(res.body.errors[0].param).toBe('content');
    expect(res.body.errors[0].msg).toBe('Content is required');
  })
});