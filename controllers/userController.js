const User = require('../models/user');

// @route   GET api/users
// @desc    Get a list of all users
// @access  Public
// @param
// @return  { users: User[] }
exports.get_users = async (req, res, next) => {
  await User.find()
    .then(users => {
      res.status(200).json({
        users: users
      });
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}

// Return a single user on GET
// @route   GET api/users/:userid
// @desc    Get a single user with userid
// @access  Public
// @param   req.params.userid: String, required, the userid of the user to get
// @return  { user: User }
exports.get_a_user = async (req, res, next) => {
  await User.findById(req.params.userid)
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({
        user: user
      });
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}

// Return a list of friends of the user with userid on GET
// @route   GET api/users/:userid/friends
// @desc    Get a list of friends of the user with userid
// @access  Public
// @param   req.params.userid: String, required, the userid of the user to get
// @return  { friends: User[] }
exports.get_friends = async (req, res, next) => {
  await User.findById(req.params.userid)
    .populate('friends')
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ 
        friends: user.friends 
      });
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}

// Return a list of posts made by the user with userid on GET
// @route   GET api/users/:userid/posts
// @desc    Get a list of posts made by the user with userid
// @access  Public
// @param   req.params.userid: String, required, the userid of the user to get
// @return  { posts: Post[] }
exports.get_posts = async (req, res, next) => {
  await User.findById(req.params.userid)
    .populate({
      path: 'posts',
      populate: {
        path: 'user',
      }
    })
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({
        posts: user.posts
      });
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}
