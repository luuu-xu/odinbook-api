const express = require('express');
const router = express.Router();

const authuser_controller = require('../controllers/authuserController');

// POST a new post by the authenticated user
router.post('/posts', authuser_controller.post_a_post);

// GET a list of posts by the authenticated user
router.get('/posts', authuser_controller.get_posts);

// GET a list of posts by the friends of the authenticated user
router.get('/friends-posts', authuser_controller.get_friends_posts);

// POST a friend request from the currentUser to another user by userid
router.post('/send-friend-request/:userid', authuser_controller.send_friend_request);

// POST to accpet a friend request from another user by userid to the currentUser
router.post('/accept-friend-request/:userid', authuser_controller.accept_friend_request);

// POST for the authenticated user to like a post by postid
router.post('/posts/:postid/give-like', authuser_controller.give_like);

// DELETE for the authenticated user to cancel the like a post by postid
router.delete('/posts/:postid/cancel-like', authuser_controller.cancel_like);

// POST for the authenticated user to comment a post by postid
router.post('/posts/:postid/comments', authuser_controller.post_a_comment);

// PUT for the authenticated user to edit its profile name and image
router.put('/edit-profile', authuser_controller.edit_profile);

module.exports = router;