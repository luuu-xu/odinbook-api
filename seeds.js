const { faker } = require('@faker-js/faker');
const User = require('./models/user');
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

async function signupRandomUsers(count) {
  for (let i = 0; i < count; i++) {
    const userData = createRandomUser();
    const user = new User(userData);
    user.password = bcrypt.hashSync(user.password, 10);
    await user.save();
    console.log(`Saved user ${user.name}`);
  }
}

async function signupAdminUser() {
  const admin = new User({
    name: 'Admin',
    username: 'admin',
    password: 'admin',
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
  await signupRandomUsers(3);
  await signupAdminUser();
  console.log('Closing MongoDB');
  await mongoose.connection.close();
}

main().catch(console.error);