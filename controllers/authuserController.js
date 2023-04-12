const User = require('../models/user');
const Post = require('../models/post');
const Comment = require('../models/comment');
const Image = require('../models/image');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const uploadImage = require('./helpers/uploadImage');
const passport = require('passport');

// @route   POST api/authuser/posts
// @desc    Create a post by the authenticated user
// @access  Private
// @param   req.body.content: String, required
//          req.user: User, required, the authenticated user
//          req.file: Multer.File, optional, the uploaded image
// @return  { post: Post }
exports.post_a_post = [
  // Upload image middleware helper with Multer
  uploadImage,

  // Add jwt authentication to the request
  passport.authenticate('jwt', { session: false }), 

  // Check that the currentUser is logged in
  async (req, res, next) => {
    console.log('req.file', req.file);
    console.log('req.body', req.body);
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
    .trim().isLength({ min: 1 }),
    // .escape(), // Do not escape the content, React has contexutal escaping
  
  // Process after validation and sanitization
  async (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create a Image object with the accepted uploaded image or empty when image is rejected
    let image;
    if (req.file) {
      image = new Image({
        filename: req.file.originalname,
        contentType: req.file.mimetype,
        data: req.file.buffer,
      });
    }

    // Create a Post object with escaped and trimmed data
    // Notice the user._id is a mongoose objectId()
    const post = new Post({
      content: req.body.content,
      user: new mongoose.Types.ObjectId(req.user._id),
      image: image
    });

    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        errors: errors.array(),
        post,
      });
    } else {
      // Data is valid
      try {
        // Save the image to the database if there is one
        if (image) {
          await image.save();
        }
        // Save post to database
        const savedPost = await post.save();
        // Reference the savedPost to the currentUser
        const currentUser = await User.findById(req.user._id);
        currentUser.posts.push(savedPost);
        await currentUser.save();
        res.status(201).json({ post: savedPost });
      } catch (err) {
        console.log(err);
        res.status(502).json({
          error: err,
        });
      }
    }
  }
];

// @route   GET api/authuser/posts?startId=:startId
// @desc    Get a sorted list of 10 posts by the authenticated user
// @access  Private
// @param   req.user: User, required, the authenticated user
//          req.query.startId: String, optinal, the startId of the post to get, if not provided, the first post
// @return  { posts: Post[] }
exports.get_posts = [
  // Add jwt authentication to the request
  passport.authenticate('jwt', { session: false }), 

  async (req, res, next) => {
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
    if (req.query.startId) {
      await Post.find({ user: req.user._id })
        .where('_id').lt(req.query.startId)
        .sort({ _id: -1 })
        .limit( 10 )
        .populate('user')
        .populate({
          path: 'comments',
          populate: {
            path: 'user',
          }
        })
        .then(posts => {
          res.status(200).json({ posts: posts });
        })
        .catch(err => {
          res.status(502).json({
            error: err,
          });
        });
    } else {
      await Post.find({ user: req.user._id })
        .sort({ _id: -1 })
        .limit( 10 )
        .populate('user')
        .populate({
          path: 'comments',
          populate: {
            path: 'user',
          }
        })
        .then(posts => {
          res.status(200).json({ posts: posts });
        })
        .catch(err => {
          res.status(502).json({
            error: err,
          });
        });
    }
  }
]

// @route   GET api/authuser/friends-posts
// @desc    Get a sorted list of posts by the friends of authenticated user
// @access  Private
// @param   req.user: User, required, the authenticated user
// @return  { posts: Post[] }
exports.get_friends_posts = [
  // Add jwt authentication to the request
  passport.authenticate('jwt', { session: false }), 

  async (req, res, next) => {
    // Check that the currentUser is logged in
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Find and check currentUser by req.user._id
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find all posts by friends
    try {
      await User.findById(req.user._id)
        .populate({
          path: 'friends',
          populate: {
            path: 'posts',
            populate: {
              path: 'user',
            }
          }
        })
        .populate({
          path: 'friends',
          populate: {
            path: 'posts',
            populate: {
              path: 'comments',
              populate: {
                path: 'user',
              }
            }
          }
        })
        .then(result => {
          const posts = [];
          result.friends.map((friend) => {
            friend.posts.map((post) => {
                posts.push(post);
              });
          });
          posts.sort((a, b) => {
            if (a.timestamp > b.timestamp) {
              return -1;
            }
            if (a.timestamp < b.timestamp) {
              return 1;
            }
          })
          res.status(200).json({ posts: posts });
        })
    } catch (err) {
      console.log(err);
      res.status(502).json({
        error: err,
      });
    }
  }
]

// @route   GET api/authuser/feed-posts?startId=:startId
// @desc    Get a sorted list of 10 posts by the friends of and the authenticated user
// @access  Private
// @param   req.user: User, required, the authenticated user
//          req.query.startId: String, optinal, the startId of the post to get, if not provided, the first post
// @return  { posts: Post[] }
exports.get_feed_posts = [
  // Add jwt authentication to the request
  passport.authenticate('jwt', { session: false }), 

  async (req, res, next) => {
    // Check that the currentUser is logged in
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Find and check currentUser by req.user._id
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Array of _ids of the authuser and the friends
    const usersIds = [currentUser._id, ...currentUser.friends];

    // Find all posts
    if (req.query.startId) {
      await Post.find({ user : { $in: usersIds } })
        .where('_id').lt(req.query.startId)
        .sort({ _id: -1 })
        .limit( 10 )
        .populate('user')
        .populate({
          path: 'comments',
          populate: {
            path: 'user',
          }
        })
        .then(posts => {
          res.status(200).json({ posts: posts });
        })
        .catch(err => {
          res.status(502).json({
            error: err,
          });
        });
    } else {
      await Post.find({ user : { $in: usersIds } })
        .sort({ _id: -1 })
        .limit( 10 )
        .populate('user')
        .populate({
          path: 'comments',
          populate: {
            path: 'user',
          }
        })
        .then(posts => {
          console.log(posts);
          res.status(200).json({ posts: posts });
        })
        .catch(err => {
          console.log(err);
          res.status(502).json({
            error: err,
          });
        });
    }
  }
]

// @route   POST api/authuser/send-friend-request/:userid
// @desc    Send a friend request from the authenticated user to another user by userid
// @access  Private
// @param   req.params.userid: String, required, the userid of the user to send a friend request to
// @return  { currentUser: User, userToSendRequestTo: User }
exports.send_friend_request = [
  // Add jwt authentication to the request
  passport.authenticate('jwt', { session: false }),

  async (req, res, next) => {
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
];

// @route   POST api/authuser/accept-friend-request/:userid
// @desc    Accept a friend request from another user by userid to the currentUser on POST
// @access  Private
// @param   req.params.userid: String, required, the userid of the user who sent the friend request
// @return  { currentUser: User, userFriendRequestFrom: User }
exports.accept_friend_request = [
  // Add jwt authentication to the request
  passport.authenticate('jwt', { session: false }), 

  async (req, res, next) => {
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
  },
];

// @route   POST api/authuser/posts/:postid/give-like
// @desc    Give a like to a post by postid by the authenticated user
// @access  Private
// @param   req.params.postid
//          req.user: User, required, the authenticated user
// @return  { post: Post }
exports.give_like = [
  // Add jwt authentication to the request
  passport.authenticate('jwt', { session: false }), 

  async (req, res, next) => {
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
      return res.status(201).json({ 
        message: 'Like added',
        post
      });

    } catch (err) {
      res.status(502).json({
        error: err,
      });
    }
  },
];

// @route   DELETE api/authuser/posts/:postid/cancel-like
// @desc    Cancel a like to a post by postid by the authenticated user
// @access  Private
// @param   req.params.postid
//          req.user: User, required, the authenticated user
// @return  { post: Post }
exports.cancel_like = [
  // Add jwt authentication to the request
  passport.authenticate('jwt', { session: false }), 

  async (req, res, next) => {
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
      if (!post.likes.includes(currentUser._id)) {
        return res.status(400).json({ message: 'Like not found' });
      }

      // Remove the currentUser from the post's likes array
      post.likes.pull(currentUser._id);
      await post.save();
      return res.status(201).json({ 
        message: 'Like cancelled',
        post
      });

    } catch (err) {
      console.log(err);
      res.status(502).json({
        error: err,
      });
    }
  },
];

// @route   POST api/authuser/posts/:postid/comments
// @desc    Add a comment to a post by postid by the authenticated user
// @access  Private
// @param   req.body.content: String, required
//          req.params.postid
//          req.user: User, required, the authenticated user
// @return  { post: Post, comment: Comment }
exports.post_a_comment = [
  // Add jwt authentication to the request
  passport.authenticate('jwt', { session: false }),

  // Check that the currentUser is logged in
  async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
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
    next();
  },

  // Validate and sanitize the comment data
  body('content', 'Content is required')
    .trim().isLength({ min: 1 }),
    // .escape(),

  // Process after validation and sanitization
  async (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    // Create a Comment object with escaped and trimmed data
    // Notice the user._id is a mongoose objectId()
    const comment = new Comment({
      content: req.body.content,
      user: new mongoose.Types.ObjectId(req.user._id),
      post: new mongoose.Types.ObjectId(req.params.postid),
    });

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
        comment
      });
    } else {
      // Data is valid
      try {
        // Save comment to database
        const savedComment = await comment.save();
        // Reference the savedComment to the post
        const post = await Post.findById(req.params.postid);
        post.comments.push(savedComment);
        await post.save();
        res.status(201).json({
          post,
          comment: savedComment
        });
      } catch (err) {
        res.status(502).json({
          error: err,
        });
      }
    }
  }
];

// @route   PUT api/authuser/edit-profile
// @desc    Change the profile picture and name of the authenticated user
// @access  Private
// @param   req.body.name: String, required, the new name of the user
//          req.body.profile_pic_url: String, required, the new profile picture of the user
//          req.user: User, required, the authenticated user
// @return  { user: User }
exports.edit_profile = [
  // Add jwt authentication to the request
  passport.authenticate('jwt', { session: false }),

  // Check that the currentUser is logged in
  async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    // Find the currentUser by req.user._id
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    next();
  },

  // Validate and sanitize the comment data
  body('name', 'Name is required')
    .trim().isLength({ min: 1 }),
    // .escape(),
  // body('profile_pic_url', 'Profile picture is required')
  //   .trim().isURL(),
  
  // Process after validation and sanitization
  async (req, res, next) => {
    // Extract the validation errors from a request
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    } else {
      // Data is valid
      try {
        // Update the currentUser's profile
        const user = await User.findByIdAndUpdate(
          req.user._id,
          {
            name: req.body.name,
            profile_pic_url: req.body.profile_pic_url
          }
        );
        res.status(200).json({
          user,
        });
      } catch (err) {
        res.status(502).json({
          error: err,
        });
      }
    }
  }

]