const express = require('express');
const router = express.Router();

const post_controller = require('../controllers/postController');

// GET a list of posts of the currentUser
router.get('/', post_controller.get_posts);

// GET a single post with postid
router.get('/:postid', post_controller.get_a_post);

module.exports = router;