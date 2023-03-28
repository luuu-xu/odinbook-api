var express = require('express');
var router = express.Router();

const user_controller = require('../controllers/userController');

// GET a list of users
router.get('/', user_controller.get_users);

// GET a single user with userid
router.get('/:userid', user_controller.get_a_user);

// GET a list of friends of the user with userid
router.get('/:userid/friends', user_controller.get_friends);

// GET a list of posts made by the user with userid
router.get('/:userid/posts', user_controller.get_posts);

module.exports = router;
