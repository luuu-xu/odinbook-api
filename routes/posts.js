const express = require('express');
const router = express.Router();

const post_controller = require('../controllers/postController');

// GET a list of posts of the currentUser
router.get('/', post_controller.get_posts);

// GET a single post with postid
router.get('/:postid', post_controller.get_a_post);

// GET a list of comments of the post with postid
router.get('/:postid/comments', post_controller.get_comments);

// GET a list of likes by users of the post with postid
router.get('/:postid/likes', post_controller.get_likes);

module.exports = router;