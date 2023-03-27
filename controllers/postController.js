const User = require('../models/user');
const Post = require('../models/post');

// Return a list of all posts of the currentUser on GET
exports.get_posts = async (req, res, next) => {
  // Check that the currentUser is logged in
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  Post.find({ user: req.user._id})
    .then(posts => {
      res.status(200).json(posts);
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}