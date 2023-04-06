const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const PostSchema = new Schema({
  content: { type: String, required: true },
  image: { type: Schema.Types.ObjectId, ref: 'Image' },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  timestamp: { type: Date, default: Date.now },
  likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
});

module.exports = mongoose.model('Post', PostSchema);