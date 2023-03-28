const User = require('../models/user');

// Return a list of all users on GET
exports.get_users = async (req, res, next) => {
  await User.find()
    .then(users => {
      res.status(200).json(users);
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}

// Return a single user on GET
exports.get_user = async (req, res, next) => {
  await User.findById(req.params.userid)
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json(user);
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}

// Return a list of friends of the user with userid on GET
exports.get_friends = async (req, res, next) => {
  await User.findById(req.params.userid)
    .populate('friends')
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json({ friends: user.friends });
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}

// Return a list of posts made by the user with userid on GET
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
      res.status(200).json({ posts: user.posts });
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}
