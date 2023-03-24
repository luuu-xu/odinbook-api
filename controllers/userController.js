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

// Return a list of friends of the user with userid on GET
exports.get_friends = async (req, res, next) => {
  User.findById(req.params.userid)
    .then(user => {
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.status(200).json(user.friends);
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}

// Make a friend request from currentUser to another user by userid on POST
exports.send_friend_request = async (req, res, next) => {
  // Check that the currentUser is logged in
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Find the currentUser by req.user._id
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the userToSendRequestTo by req.params.userid
    const userToSendRequestTo = await User.findById(req.params.userid);
    if (!userToSendRequestTo) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the currentUser has already sent a friend request to this user
    if (currentUser.friend_requests_sent.includes(userToSendRequestTo._id)) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }
    
    // Check if the currentUser is already friends with this user
    if (currentUser.friends.includes(userToSendRequestTo._id)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    // Add the user to send the request to to the currentUser's friend requests sent array
    currentUser.friend_requests_sent.push(userToSendRequestTo._id);
    await currentUser.save();
    
    // Add the currentUser to the user's friend requests received array
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

// Accept a friend request from another user by userid to the currentUser on POST
exports.accept_friend_request = async (req, res, next) => {
  // Check that the currentUser is logged in
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // Find the currentUser by req.user._id
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the userFriendRequestFrom by req.params.userid
    const userFriendRequestFrom = await User.findById(req.params.userid);
    if (!userFriendRequestFrom) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the currentUser is already friends with this user
    if (currentUser.friends.includes(userFriendRequestFrom._id)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    // Add the userFriendRequestFrom to the currentUser's friends array
    currentUser.friends.push(userFriendRequestFrom._id);
    // Delete the userFriendRequestFrom from the currentUser's friend_requests_received array
    currentUser.friend_requests_received.splice(currentUser.friend_requests_received.indexOf(userFriendRequestFrom._id), 1);
    await currentUser.save();

    // Add the currentUser to the userFriendRequestFrom's friends array
    userFriendRequestFrom.friends.push(currentUser._id);
    // Delete the currentUser from the userFriendRequestFrom's friend_requests_sent array
    userFriendRequestFrom.friend_requests_sent.splice(userFriendRequestFrom.friend_requests_sent.indexOf(currentUser._id), 1);
    await userFriendRequestFrom.save();

    // Send a response with the updated user objects
    res.status(200).json({
      message: 'Friend request accepted',
      currentUser,
      userFriendRequestFrom
    }); 
  } catch(err) {
    res.status(502).json({
      error: err,
    });
  }
}