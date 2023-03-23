var express = require('express');
var router = express.Router();

const user_controller = require('../controllers/userController');

// GET a list of users
router.get('/', user_controller.get_users);

// GET a single user with userid
router.get('/:userid', user_controller.get_user);

// POST a friend request from the current user to another user by userid
router.post('/:userid/send-friend-request', user_controller.send_friend_request);

module.exports = router;
