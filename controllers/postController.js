const User = require('../models/user');
const Post = require('../models/post');

// @route   GET api/posts
// @desc    Get a list of posts sorted by timestamp
// @access  Public
// @param
// @return  { posts: Post[] }
exports.get_posts = async (req, res, next) => {
  await Post.find()
    .sort({ timestamp: -1})
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

// @route   GET api/posts/:postid
// @desc    Get a single post with postid
// @access  Public
// @param   req.params.postid: String, required, the postid of the post to get
// @return  { post: Post }
exports.get_a_post = async (req, res, next) => {
  await Post.findById(req.params.postid)
    .populate('user')
    .then(post => {
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      res.status(200).json({ 
        post: post
      });
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}

// @route   GET api/posts/:postid/comments
// @desc    Get a list of comments of the post with postid
// @access  Public
// @param   req.params.postid: String, required, the postid of the post to get
// @return  { comments: Comment[] }
exports.get_comments = async (req, res, next) => {
  await Post.findById(req.params.postid)
    .populate({
      path: 'comments',
      populate: {
        path: 'user',
      }
    })
    .then(post => {
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      res.status(200).json({ 
        comments: post.comments 
      });
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}

// @route   GET api/posts/:postid/likes
// @desc    Get a list of users who gave a like to the post with postid
// @access  Public
// @param   req.params.postid: String, required, the postid of the post to get
// @return  { likes: User[] }
exports.get_likes = async (req, res, next) => {
  await Post.findById(req.params.postid)
    .populate('likes')
    .then(post => {
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }
      res.status(200).json({ 
        likes: post.likes 
      });
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}