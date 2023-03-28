const User = require('../models/user');
const Post = require('../models/post');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

// @route   POST api/authuser/posts
// @desc    Create a post by the authenticated user
// @access  Private
exports.post_a_post = [
  // Check that the currentUser is logged in
  async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Find and check currentUser by req.user._id
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    } else {
      next();
    }
  },

  // Validate and sanitize the post data
  body('content', 'Content is required')
    .trim().isLength({ min: 1 }).escape(),
  
  // Process after validation and sanitization
  async (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create a Post object with escaped and trimmed data
    // Notice the user._id is a mongoose objectId()
    const post = new Post({
      content: req.body.content,
      user: new mongoose.Types.ObjectId(req.user._id),
    });

    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array(),
        post,
      });
    } else {
      // Data is valid
      try {
        // Save post to database
        const savedPost = await post.save();
        // Reference the savedPost to the currentUser
        const currentUser = await User.findById(req.user._id);
        currentUser.posts.push(savedPost);
        await currentUser.save();
        res.status(201).json({ post: savedPost });
      } catch (err) {
        res.status(502).json({
          error: err,
        });
      }
    }
  }
];

// @route   GET api/authuser/posts
// @desc    Get a list of posts by the authenticated user
// @access  Private
exports.get_posts = async (req, res, next) => {
  // Check that the currentUser is logged in
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  // Find and check currentUser by req.user._id
  const currentUser = await User.findById(req.user._id);
  if (!currentUser) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Find all posts
  try {
    await User.findById(req.user._id).populate('posts')
      .then(user => {
        // console.log('post_list', user.posts);
        res.status(200).json({ posts: user.posts });
      })
  } catch (err) {
    res.status(502).json({
      error: err,
    });
  }
}

// @route   POST api/authuser/send-friend-request/:userid
// @desc    Send a friend request from the authenticated user to another user by userid
// @access  Private
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

// @route   POST api/authuser/accept-friend-request/:userid
// @desc    Accept a friend request from another user by userid to the currentUser on POST
// @access  Private
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

// @route   POST api/authuser/posts/:postid/give-like
// @desc    Give a like to a post by postid by the authenticated user
// @access  Private
exports.give_like = async (req, res, next) => {
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

    // Find the post by req.params.postid
    const post = await Post.findById(req.params.postid);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if the currentUser has already liked this post
    if (post.likes.includes(currentUser._id)) {
      return res.status(400).json({ message: 'Already liked' });
    }

    // Add the currentUser to the post's likes array
    post.likes.push(currentUser._id);
    await post.save();

  } catch (err) {
    res.status(502).json({
      error: err,
    });
  }
}