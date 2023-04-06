const { faker } = require('@faker-js/faker');
const User = require('./models/user');
const Post = require('./models/post');
const Comment = require('./models/comment');
const Image = require('./models/image');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

function createRandomUser() {
  return {
    name: faker.internet.userName(),
    username: faker.internet.email(),
    password: faker.internet.password(),
    profile_pic_url: faker.image.avatar(),
  }
}

function createHelloPost({ name, userId }) {
  const randomEmoji = faker.internet.emoji();
  return {
    content: `Hello from ${name}! ${randomEmoji}`,
    user: userId,
  }
}

async function signupRandomUsers(count) {
  for (let i = 0; i < count; i++) {
    const userData = createRandomUser();
    const user = new User(userData);
    user.password = bcrypt.hashSync(user.password, 10);
    await user.save();
    console.log(`Saved user ${user.name}`);
    const postData = createHelloPost({ name: user.name, userId: user._id });
    const post = new Post(postData);
    await post.save();
    user.posts.push(post);
    await user.save();
    console.log(`Saved post ${post.content}`);
  }
}

async function signupAdminUser() {
  const admin = new User({
    name: 'Admin',
    username: 'admin',
    password: 'admin',
    profile_pic_url: 'https://avatars.githubusercontent.com/u/97932191?s=48&v=4',
  });
  admin.password = bcrypt.hashSync(admin.password, 10);
  await admin.save();
  console.log(`Saved admin user ${admin.name}`);
}

mongoose.set('strictQuery', false);
const mongoDB = process.env.MONGODB_URL;
async function main() {
  console.log('About to connect');
  await mongoose.connect(mongoDB);
  await User.deleteMany();
  await Post.deleteMany();
  await Comment.deleteMany();
  await Image.deleteMany();
  await signupRandomUsers(3);
  await signupAdminUser();
  console.log('Closing MongoDB');
  await mongoose.connection.close();
}

main().catch(console.error);