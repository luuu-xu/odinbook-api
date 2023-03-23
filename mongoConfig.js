const mongoose = require('mongoose');

// mongoose setup
mongoose.set('strictQuery', false);
const mongoDB = process.env.MONGODB_URL;
async function main() {
  await mongoose.connect(mongoDB);
}
main().catch(console.error);