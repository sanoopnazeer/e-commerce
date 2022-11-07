var express = require('express');
const { response } = require('../app');
var router = express.Router();
var productHelpers = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers')
const { check, validationResult } = require('express-validator');


const verifyLogin = (req, res, next) => {
  if(req.session.loggedIn){
    next()
  }else{
    res.redirect('/login');
  }
}

/* GET home page. */
router.get('/', async function(req, res, next) {
  let user = req.session.user
  let cartCount = null
  if(req.session.user){
    cartCount = await userHelpers.getCartCount(req.session.user._id)
  }
  productHelpers.getAllProducts().then((products) => {
    res.render('user/view-products', {products, user, cartCount});
  })
});

router.get('/login', function(req, res, next) {
  if(req.session.loggedIn){
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
  req.session.user.loggedIn = true
  req.session.user = response
  res.redirect('/')
})

router.post('/login', (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if(response.status){
      req.session.user = response.user 
      req.session.loggedIn = true
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

router.get('/cart',verifyLogin, async(req, res) => {
  if(req.session.user){
  let user = req.session.user._id
  cartCount = await userHelpers.getCartCount(req.session.user._id)
  let products = await userHelpers.getCartProducts(req.session.user._id)
  let total = await userHelpers.getTotalAmount(req.session.user._id)
    res.render('user/cart', {products, user, cartCount, total});
  }else{
    res.redirect('/login')
  }
})

router.get('/add-to-cart/:id', (req, res) => {
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
res.json({status: true}) 
 })
})

router.get('/single/:id', async(req, res) => {
  if(req.session.user){
    let user = req.session.user
    cartCount = await userHelpers.getCartCount(req.session.user._id)
    let product = await productHelpers.getProductDetails(req.params.id)
    res.render('user/single', {product, user, cartCount})
  }
  console.log(req.params.id);
  let product = await productHelpers.getProductDetails(req.params.id)
    res.render('user/single', {product})
})

router.get('/about', (req, res) => {
  res.render('user/about')
})

router.get('/contact', (req, res) => {
  res.render('user/contact')
})

router.post('/change-product-quantity', (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then(async(response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user)
      res.json(response)
  })
})

router.post('/remove-item', (req, res) => {
  userHelpers.removeItem(req.body).then((response) => {
    res.json(response)
  })
})

router.get('/place-order', async(req, res) => {
  let user = req.session.user
  cartCount = await userHelpers.getCartCount(req.session.user._id)
  let total = await userHelpers.getTotalAmount(req.session.user._id)
  let products = await userHelpers.getCartProducts(req.session.user._id)
  res.render('user/place-order', {user, cartCount, total, products})
})

router.post('/place-order', async(req, res) => {
  let products = await userHelpers.getCartProductList(req.body.userId)
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId)
  userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
    if(req.body['payment-method']=='COD'){
      res.json({status : true})
    }else{
       userHelpers.generateRazorpay(orderId).then((response) => {
        
       })
    }
  })
})

router.get('/order-successful', (req, res) => {
  const user = req.session.user
  res.render('user/orderSuccessful', {user})
})

router.get('/view-orders', async(req, res) => {
  const user = req.session.user
  const allOrders = await userHelpers.getAllOrders(req.session.user._id)
    res.render('user/view-orders', {user, allOrders})
})

router.get('/view-ordered-items', async(req, res) => {
  const user = req.session.user
  const orderId = req.query.id
  const products = await userHelpers.getOrderedItems(orderId)
  res.render('user/view-ordered-items', {user, products})
})

router.get('/cancel-order/:id', (req, res) => {
  console.log(req.params.id);
  userHelpers.cancelOrder(req.params.id).then((response) => {
    res.redirect('/view-orders')
  })
})

module.exports = router;
