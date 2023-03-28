const User = require('../models/user');
const Post = require('../models/post');

// @route   GET api/posts
// @desc    Get a list of posts
// @access  Public
// @param
// @return  { posts: Post[] }
exports.get_posts = async (req, res, next) => {
  await Post.find()
    .then(posts => {
      res.status(200).json(posts);
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
      res.status(200).json({ post });
    })
    .catch(err => {
      res.status(502).json({
        error: err,
      });
    });
}