var express = require('express');
const passport = require('passport');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

// // GET protected page
// router.get('/protected', 
//   function(req, res, next) {
//     if (req.isAuthenticated()) {
//       res.send('protected page shown');
//     } else {
//       res.status(401).send('Unauthorized');
//     }
// })

// GET protected page
router.get('/protected', 
  passport.authenticate('jwt', { session: false }), 
  function(req, res, next) {
    res.send('protected page shown');
  }
)

module.exports = router;
