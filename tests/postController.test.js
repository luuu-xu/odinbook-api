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

let mockPostData = {
  content: 'This is a test post',
};

let mockCommentData = {
  content: 'This is a test comment',
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

describe('GET /api/posts/:postid', () => {
  let currentUser = mockUsers[0]; // Alice
  let mockPost = mockPostData;
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

  afterAll(async () => {
    // Clear the database
    await Post.deleteMany({});
  });

  it('should return 404 error if the post is not found', async () => {
    const res = await authenticatedSession
      .get(`/api/posts/${new mongoose.Types.ObjectId()}`)
      .expect(404);
    expect(res.body.message).toBe('Post not found');
  });

  it('should return the post with postid', async () => {
    // Alice post a post
    let res = await authenticatedSession
      .post('/api/authuser/posts').send(mockPostData).expect(201);
    mockPost._id = res.body.post._id;
    // Post another post
    await authenticatedSession
      .post('/api/authuser/posts').send({ content: 'Not this post'}).expect(201);
    // Get the post
    res = await authenticatedSession
      .get(`/api/posts/${mockPost._id}`)
      .expect(200);
    expect(res.body.post.content).toBe(mockPost.content);
    expect(res.body.post.user._id).toBe(currentUser._id.toString());
  });
});

describe('GET /api/posts', () => {
  let currentUser = mockUsers[0]; // Alice
  let mockPost = mockPostData;
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

  it('should return a empty array if no posts are found', async () => {
    const res = await authenticatedSession
      .get('/api/posts')
      .expect(200);
    expect(res.body.posts).toHaveLength(0);
  });

  it('should return a list of posts', async () => {
    // Alice post some posts
    let res = await authenticatedSession
      .post('/api/authuser/posts').send(mockPostData).expect(201);
    mockPost._id = res.body.post._id;
    await authenticatedSession
      .post('/api/authuser/posts').send({ content: 'Second post'}).expect(201);
    await authenticatedSession
      .post('/api/authuser/posts').send({ content: 'Third post'}).expect(201);
    // Get the post
    res = await authenticatedSession
      .get('/api/posts')
      .expect(200);
    // console.log(res.body);
    expect(res.body.posts).toHaveLength(3);
    expect(res.body.posts[2].content).toBe(mockPost.content);
    expect(res.body.posts[1].content).toBe('Second post');
    expect(res.body.posts[0].content).toBe('Third post');
  })
});

describe('GET /api/posts/:postid/comments', () => {
  let currentUser = mockUsers[0]; // Alice
  let mockPost = mockPostData;
  let mockComment = mockCommentData;
  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    // Log in as Alice
    testSession = session(app);
    await testSession.post('/api/auth/login').send({
      username: currentUser.username,
      password: 'password123',
    }).expect(200);
    authenticatedSession = testSession;
    // Alice posts a post
    const res = await authenticatedSession
      .post('/api/authuser/posts').send(mockPostData).expect(201);
    mockPost._id = res.body.post._id;
  });

  it('should return an empty array if no comments are found', async () => {
    // await Post.find().then(posts => console.log(posts));
    const res = await authenticatedSession
      .get(`/api/posts/${mockPost._id}/comments`)
      .expect(200);
    expect(res.body.comments).toHaveLength(0);
  });

  it('should return a 404 error if the post is not found', async () => {
    // Delete the posts
    await Post.deleteMany({});
    const res = await authenticatedSession
      .get(`/api/posts/${mockPost._id}/comments`)
      .expect(404);
    expect(res.body.message).toBe('Post not found');
  });

  it('should return a list of comments', async () => {
    // Alice post a comment
    let res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/comments`)
      .send(mockCommentData)
      .expect(201);
    mockComment._id = res.body.comment._id;
    res = await authenticatedSession
      .get(`/api/posts/${mockPost._id}/comments`)
      .expect(200);
    expect(res.body.comments).toHaveLength(1);
    expect(res.body.comments).toContainEqual(
      expect.objectContaining({ content: mockComment.content }));
    expect(res.body.comments).toContainEqual(
      expect.objectContaining({ user: expect.objectContaining( { name: currentUser.name } )})
    );
    // Sign in as Bob and post a comment
    const bob = mockUsers[1];
    await authenticatedSession
      .post('/api/auth/login').send({
      username: bob.username,
      password: 'password123',
    }).expect(200);
    res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/comments`)
      .send({ content: 'Comment from Bob'})
      .expect(201);
    res = await authenticatedSession
      .get(`/api/posts/${mockPost._id}/comments`)
      .expect(200);
    expect(res.body.comments).toHaveLength(2);
    expect(res.body.comments).toContainEqual(
      expect.objectContaining({ content: 'Comment from Bob' })
    );
    expect(res.body.comments).toContainEqual(
      expect.objectContaining({ user: expect.objectContaining( { name: bob.name } )})
    );
  })
});

describe('GET /api/posts/:postid/likes', () => {
  let currentUser = mockUsers[0]; // Alice
  let mockPost = mockPostData;
  let testSession = null;
  let authenticatedSession;

  beforeEach(async () => {
    // Log in as Alice
    testSession = session(app);
    await testSession.post('/api/auth/login').send({
      username: currentUser.username,
      password: 'password123',
    }).expect(200);
    authenticatedSession = testSession;
    // Alice posts a post
    const res = await authenticatedSession
      .post('/api/authuser/posts').send(mockPostData).expect(201);
    mockPost._id = res.body.post._id;
  });

  it('should return an empty array if no likes are found', async () => {
    const res = await authenticatedSession
      .get(`/api/posts/${mockPost._id}/likes`)
      .expect(200);
    expect(res.body.likes).toHaveLength(0);
  });

  it('should return a 404 error if the post is not found', async () => {
    // Delete the posts
    await Post.deleteMany({});
    const res = await authenticatedSession
      .get(`/api/posts/${mockPost._id}/likes`)
      .expect(404);
    expect(res.body.message).toBe('Post not found');
  });

  it('should return a list of likes', async () => {
    // Alice post a like
    let res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/give-like`)
      .expect(200);
    console.log(res.body);
    res = await authenticatedSession
      .get(`/api/posts/${mockPost._id}/likes`)
      .expect(200);
    console.log(res.body);
    expect(res.body.likes).toHaveLength(1);
    expect(res.body.likes).toContainEqual(
      expect.objectContaining({ name: currentUser.name })
    );
    // Log in as Charlie and post a like
    const charlie = mockUsers[2];
    await authenticatedSession
      .post('/api/auth/login').send({
        username: charlie.username, 
        password: 'password123',
      })
      .expect(200);
    res = await authenticatedSession
      .post(`/api/authuser/posts/${mockPost._id}/give-like`)
      .expect(200);
    res = await authenticatedSession
      .get(`/api/posts/${mockPost._id}/likes`)
      .expect(200);
    expect(res.body.likes).toHaveLength(2);
    expect(res.body.likes).toContainEqual(
      expect.objectContaining({ name: charlie.name })
    );
  });
});