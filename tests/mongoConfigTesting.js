const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

async function initializeMongoServer() {
  await mongoose.disconnect();

  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);

  mongoose.connection.on('error', (err) => {
    if (err.message.code === 'ETIMEDOUT') {
      console.error(err);
      mongoose.connect(mongoUri);
    }
    console.log(err);
  });

  // mongoose.connection.once('open', () => {
  //   console.log('MongoDB connection established');
  // });
}

async function closeMongoServer() {
  await mongoose.connection.close();
  // console.log('mongoose connection closed');
  await mongoServer.stop();
  // console.log('MongoDB connection closed');
}

async function clearMongoServer() {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany();
  }
}

module.exports = {
  initializeMongoServer,
  closeMongoServer,
  clearMongoServer,
};