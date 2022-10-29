var express = require('express');
const { response } = require('../app');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers')
const { check, validationResult } = require('express-validator');


const verifyLogin = (req, res, next) => {
  if(req.session.user.loggedIn){
    next()
  }else{
    res.redirect('/login');
  }
}

/* GET home page. */
router.get('/', function(req, res, next) {
  let user = req.session.user
  productHelpers.getAllProducts().then((products) => {
    res.render('user/view-products', {products, user});
  })
});

router.get('/login', function(req, res, next) {
  if(req.session.user){
    res.redirect('/');
  }else{
  res.render('user/login', {"loginErr": req.session.userLoginErr});
  req.session.userLoginErr = false
  }
})

router.get('/signup', function(req, res, next) {
  res.render('user/signup');
})

router.post('/signup',
  check('Name').notEmpty()
  .withMessage('Please enter a Name'),
  check('Email').notEmpty()
  .withMessage('Please enter a username'),
  check('Email').matches(/^\w+([\._]?\w+)?@\w+(\.\w{2,3})(\.\w{2})?$/)
  .withMessage("Username must be a valid email id"),
  check('Password').matches(/[\w\d!@#$%^&*?]{8,}/)
  .withMessage("Password must contain at least eight characters"),
  check('Password').matches(/[a-z]/)
  .withMessage("Password must contain at least one lowercase letter"),
  check('Password').matches(/[A-Z]/)
  .withMessage("Password must contain at least one uppercase letter"),
  check('Password').matches(/\d/)
  .withMessage("Password must contain at least one number"),
  check('Password').matches(/[!@#$%^&*?]/)
  .withMessage("Password must contain at least one special character"),
 (req, res, next) => {
      const errors = validationResult(req);
      console.log(errors)
      var error1 = errors.errors.find(item => item.param === 'Name') || '';
      var error2 = errors.errors.find(item => item.param === 'Email') || '';
      var error3 = errors.errors.find(item => item.param === 'Password') || '';
      console.log(error3.msg);
      if (!errors.isEmpty()) {
        let errors = { nameMsg: error1.msg, usernameMsg: error2.msg, pwdMsg: error3.msg }
        res.render('user/signup', {errors} );
    } else {
          userHelpers.doSignup(req.body).then((response) => {
          req.session.user = response
          req.session.user.loggedIn = true;
          res.redirect('/otpLoginVerify')
  })
    }
})

router.get('/otpLoginVerify', (req, res) => {
  res.render('user/otpLoginVerify')
})

router.post('/otpLoginVerify', (req, res) => {
  userHelpers.otpSignupVerifyPost(req, res)
  req.session.loggedIn = true
  req.session.user = response
  res.redirect('/')
})

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if(response.status){
      req.session.user = response.user 
      req.session.user.loggedIn = true
      res.redirect('/');
    }else{
      req.session.userLoginErr="Invalid username or password"
      res.redirect('/login');
    }
  })
})

router.get('/logout', (req, res) => {
  req.session.user=null
  res.redirect('/');
})

router.get('/cart', async(req, res) => {
  if(req.session.user){
  let products =await userHelpers.getCartProducts(req.session.user._id)
    res.render('user/cart', products);
  }else{
    res.redirect('/login')
  }
})

router.get('/add-to-cart/:id', (req, res) => {
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.redirect('/')
  })
})

router.get('/single', (req, res) => {
  res.render('user/single')
})

module.exports = router;
