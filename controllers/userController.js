const User = require('../models/user');

// Return a list of all users on GET
exports.get_users = async (req, res, next) => {
  User.find()
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
  User.findById(req.params.userid)
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

// Make a friend request from current user to another user by userid on POST
exports.send_friend_request = async (req, res, next) => {
  try {
    // Find the current user by userid
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the user to send the friend request to by ID
    const userToSendRequestTo = await User.findById(req.params.userid);
    if (!userToSendRequestTo) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the current user has already sent a friend request to this user
    if (currentUser.friend_requests_sent.includes(userToSendRequestTo._id)) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }
    
    // Check if the current user is already friends with this user
    if (currentUser.friends.includes(userToSendRequestTo._id)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    // Add the user to send the request to to the current user's friend requests sent array
    currentUser.friend_requests_sent.push(userToSendRequestTo._id);
    await currentUser.save();
    
    // Add the current user to the user's friend requests received array
    userToSendRequestTo.friend_requests_received.push(currentUser._id);
    await userToSendRequestTo.save();
    
    // Send a response with the updated user objects
    res.status(200).json({
      message: 'Friend request sent',
      currentUser,
      userToSendRequestTo
    });
  } catch(err) {
    res.status(502).json({
      error: err,
    });
  }
}