const Post = require('../models/post');
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
      console.log(err);
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
    .populate('friends friend_requests_sent friend_requests_received')
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
// @route   GET api/users/:userid/posts?startId=startId
// @desc    Get a list of 10 posts made by the user with userid 
// @access  Public
// @param   req.params.userid: String, required, the userid of the user to get
//          req.query.startId: String, optinal, the startId of the post to get, if not provided, the first post
// @return  { posts: Post[] }
exports.get_posts = async (req, res, next) => {
  if (req.query.startId) {
    await Post.find({ user: req.params.userid })
      .where('_id').lt(req.query.startId)
      .sort({ _id: -1 })
      .limit(10)
      .populate('user')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
        }
      })
      .then(posts => {
        res.status(200).json({
          posts: posts
        });
      })
      .catch(err => {
        res.status(502).json({
          error: err,
        });
      });
  } else {
    await Post.find({ user: req.params.userid })
      // .where('_id').lt(req.query.startId)
      .sort({ _id: -1 })
      .limit(10)
      .populate('user')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
        }
      })
      .then(posts => {
        res.status(200).json({
          posts: posts
        });
      })
      .catch(err => {
        res.status(502).json({
          error: err,
        });
      });
  }
}
