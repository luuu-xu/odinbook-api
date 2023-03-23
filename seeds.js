const { faker } = require('@faker-js/faker');
const User = require('./models/user');
const mongoose = require('mongoose');
require('dotenv').config();

function createRandomUser() {
  return {
    name: faker.internet.userName(),
    username: faker.internet.email(),
    password: faker.internet.password(),
    profile_pic_url: faker.image.avatar(),
  }
}

async function populateRandomUsers(count) {
  for (let i = 0; i < count; i++) {
    const userData = createRandomUser();
    const user = new User(userData);
    await user.save();
    console.log(`Saved user ${user.name}`);
  }
}

mongoose.set('strictQuery', false);
const mongoDB = process.env.MONGODB_URL;
async function main() {
  console.log('About to connect');
  await mongoose.connect(mongoDB);
  await populateRandomUsers(5);
  console.log('Closing MongoDB');
  mongoose.connection.close();
}

main().catch(console.error);