const express = require('express');
const router = express.Router();

const authuser_controller = require('../controllers/authuserController');

// POST a new post by the authenticated user
router.post('/posts', authuser_controller.post_a_post);

// GET a list of posts by the authenticated user
router.get('/posts', authuser_controller.get_posts);

module.exports = router;