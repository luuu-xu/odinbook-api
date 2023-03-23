const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  name: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  profile_pic_url: { type: String },
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  friend_requests_sent: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  friend_requests_received: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  posts: [{ type: Schema.Types.ObjectId, ref: 'Post' }],
});

module.exports = mongoose.model('User', UserSchema);