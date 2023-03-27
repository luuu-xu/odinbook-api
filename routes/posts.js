const express = require('express');
const router = express.Router();

const post_controller = require('../controllers/postController');

// GET a list of posts of the currentUser
router.get('/', post_controller.get_posts);

module.exports = router;