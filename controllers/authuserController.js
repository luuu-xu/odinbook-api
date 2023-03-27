const User = require('../models/user');
const Post = require('../models/post');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');

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