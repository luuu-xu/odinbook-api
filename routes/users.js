var express = require('express');
var router = express.Router();

const user_controller = require('../controllers/userController');

// GET a list of users
router.get('/', user_controller.get_users);

// GET a single user with userid
router.get('/:userid', user_controller.get_user);

// GET a list of friends of the user with userid
router.get('/:userid/friends', user_controller.get_friends);

// POST a friend request from the currentUser to another user by userid
router.post('/send-friend-request/:userid', user_controller.send_friend_request);

// POST to accpet a friend request from another user by userid to the currentUser
router.post('/accept-friend-request/:userid', user_controller.accept_friend_request);

module.exports = router;
