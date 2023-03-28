const express = require('express');
const router = express.Router();

const authuser_controller = require('../controllers/authuserController');

// POST a new post by the authenticated user
router.post('/posts', authuser_controller.post_a_post);

// GET a list of posts by the authenticated user
router.get('/posts', authuser_controller.get_posts);

// POST a friend request from the currentUser to another user by userid
router.post('/send-friend-request/:userid', authuser_controller.send_friend_request);

// POST to accpet a friend request from another user by userid to the currentUser
router.post('/accept-friend-request/:userid', authuser_controller.accept_friend_request);

module.exports = router;