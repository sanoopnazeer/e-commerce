var express = require('express');
const { response } = require('../app');
const productHelpers = require('../helpers/product-helpers');
// const {render} = require('../app');
var router = express.Router();
var productHelper = require('../helpers/product-helpers')
const userHelpers = require('../helpers/user-helpers')

const verifyLogin = (req, res, next) => {
  if(req.session.admin.loggedIn){
    next()
  }else{
    res.redirect('/adminLogin');
  }
}

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.render('admin/adminLogin', {"loginErr": req.session.adminLoginErr, admin : true});
  req.session.adminLoginErr = false
})

router.get('/adminSignup', function(req, res, next) {
  res.render('admin/adminSignup', {admin : true});
})

router.post('/adminSignup', (req, res) => {
  productHelpers.doAdminSignup(req.body).then((response) => {
    req.session.adminLoggedIn = true;
    req.session.admin = response
    res.redirect('/admin')
  })
})

router.post('/adminLogin', (req, res) => {
  productHelpers.doAdminLogin(req.body).then((response) => {
    if(response.status){
      req.session.admin = response.admin
      req.session.admin.loggedIn = true
      res.render('admin/adminHome', {admin : true});
    }else{
      req.session.adminLoginErr="Invalid username or password"
      res.redirect('/admin');
    }
  })
})

router.get('/view-products', function(req, res) {
  productHelper.getAllProducts().then((products) => {
    console.log(products);
    res.render('admin/view-products', {admin : true, products});
  });
});

router.get('/view-users', function(req, res) {
  userHelpers.getAllUsers().then((users) => {
    res.render('admin/view-users', {admin : true, users});
  });
});

router.get('/block-user/:id', async(req, res) => {
  userHelpers.blockUser(req.params.id)
    res.redirect('/admin/view-users')
})

router.get('/unblock-user/:id', async(req, res) => {
  userHelpers.unblockUser(req.params.id)
    res.redirect('/admin/view-users')
})

router.get('/add-product', function(req, res){
  res.render('admin/add-product', {admin : true})
})

router.post('/add-product', (req, res)=>{
  
  productHelpers.addProduct(req.body, (id)=> {
    let image = req.files.Image
    console.log(id);
    image.mv('./public/product-images/'+id+'.jpg',(err) => {
      if(!err){
        res.redirect('/admin/view-products')
      }else{
        console.log(err);
      }
    })
  })
})

router.get('/delete-product/:id', (req, res) => {
  let proId = req.params.id
   productHelpers.deleteProduct(proId).then((response) => {
    res.redirect('/admin/view-products')
  })
})

router.get('/edit-product/:id', async (req, res) =>{
  let product = await productHelpers.getProductDetails(req.params.id)
    res.render('admin/edit-product', {product})
})

router.post('/edit-product/:id', (req, res) => {
  let id = req.params.id
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect('/admin/view-products')
    if(req.files.Image){
      let image = req.files.Image
      image.mv('./public/product-images/'+id+'.jpg')
    }
  })
})

router.post('/adminLogout', function (req, res) {
  adminSession=req.session
  adminSession.adminid=false
  adminSession.incorrect=false
  adminSession.alreadyexist=false
  res.redirect('/admin');
});

module.exports = router;



// var express = require('express');
// var router = express.Router();

// var bcrypt = require('bcryptjs');

// const User = require('./model')

// const { check, validationResult } = require('express-validator');

// let adminSession;

// /* GET home page. */
// router.get('/', function(req, res) {
//  
//     adminSession = req.session
//     console.log(adminSession)
//     console.log(adminSession.adminid)
//     if (adminSession.adminid) {
//         res.redirect('/admin/adminHomepage');
//     } else if (adminSession.incorrect) {
//         req.session.destroy();
//         const item = [{ message: 'Incorrect username or password' }]
//         res.render('adminLogin', { item });
//     } else {
//         res.render('adminLogin');
//     }
// });



// router.post('/adminHome', function (req, res) {
//     if (req.body.username === 'admin' && req.body.password === 'Admin@123') {
//         adminSession = req.session
//         adminSession.adminid = true;
//         res.redirect('/admin/adminHomepage');
//     } else {
//         adminSession = req.session
//         adminSession.incorrect = true;
//         res.redirect('/admin');
//     }
// });

// router.get('/adminHomepage', function (req, res) {
//     adminSession = req.session;
//     User.find({}).sort({_id:-1})
//         .then((result) => {
//             if (adminSession.adminid) {
                
//                 res.render('adminHome', { result })
//             } else {
//                 res.redirect('/admin');
//             }
//         })
//         .catch((err) => {
//             console.log(err)
//             res.redirect('/admin');
//         })
// });

// router.post('/adminSearch', function (req, res) {
//     adminSession = req.session
//     if (adminSession.adminid) {
//         User.find({ $or: [{ username: req.body.input }, { name: req.body.input }] })
//             .then((result) => {
//                 if (adminSession.adminid && req.body.input) {
//                     res.render('adminHome', { result })
//                 } else {
//                     res.redirect('/admin');
//                 }
//             })
//             .catch((err) => {
//                 console.log(err)
//                 // res.redirect('/admin');
//             })
//     } else {
//         res.redirect('/admin');
//     }
// });

// router.get('/addNewUser', function (req, res) {
//     adminSession = req.session
//     if (adminSession.adminid) {
//         if (adminSession.alreadyexist) {
//             req.session.destroy();
//             adminSession = req.session
//             adminSession.adminid = true;
//             const item = [{ message: 'Username already exist' }]
//             res.render('addNewUser', { item });
//         } else {
//             res.render('addNewUser');
//         }
//     } else {
//         res.redirect('/admin');
//     }
// });

// router.post('/addNewUser',
//     check('name').notEmpty().withMessage('Please enter a Name'),
//     check('username').notEmpty().withMessage('Please enter a username'),
//     check('name').notEmpty().withMessage('Please enter a Name'),
//     check('username').notEmpty().withMessage('Please enter a username'),
//     check('password').matches(/[A-Za-z\d!@#$%^&*?]{8,}/)
//     .withMessage("Password must contain at least eight characters"),
//     check('password').matches(/[a-z]/)
//     .withMessage("Password must contain at least one lowercase letter"),
//     check('password').matches(/[A-Z]/)
//     .withMessage("Password must contain at least one uppercase letter"), 
//     check('password').matches(/\d/)
//     .withMessage("Password must contain at least one number"),
//     check('password').matches(/[!@#$%^&*?]/)
//     .withMessage("Password must contain at least one special character"),
//     function (req, res) {
//         const errors = validationResult(req);
//         console.log(errors)
//         var error1 = errors.errors.find(item => item.param === 'name') || '';
//         var error2 = errors.errors.find(item => item.param === 'username') || '';
//         var error3 = errors.errors.find(item => item.param === 'password') || '';
//         console.log(error3.msg);
//         adminSession = req.session;
//         if (!errors.isEmpty()) {
//             res.render('addNewUser', { nameMsg: error1.msg, usernameMsg: error2.msg, pwdMsg: error3.msg });
//         } else if (adminSession.adminid) {
//             User.find({ username: req.body.username })
//                 .then((result) => {
//                     let b = result.find(item => item.username)
//                     let hashPassword;
//                     bcrypt.hash(req.body.password, 10).then(function (hash) {
//                         hashPassword = hash
//                         if (b) {
//                             adminSession = req.session;
//                             adminSession.alreadyexist = true;
//                             res.redirect('/admin/addNewUser');
//                         } else {
//                             const user = new User({
//                                 name: req.body.name,
//                                 data: req.body.data,
//                                 username: req.body.username,
//                                 password: hashPassword
//                             })
//                             user.save()
//                                 .then((result) => {
//                                     console.log(result)
//                                 })
//                                 .catch((err) => {
//                                     console.log(err)
//                                 })
//                             adminSession = req.session;
//                             console.log(adminSession)
//                             res.redirect('/admin');
//                         }
//                     })
//                 })
//                 .catch((err) => {
//                     console.log(err)
//                 })
//         } else {
//             res.redirect('/admin');
//         }
//     });

// router.get('/edit/:id', function (req, res) {
//     console.log(req.params);
//     let userId = req.params.id;
//     console.log(userId);
//     adminSession = req.session;
//     if (adminSession.adminid) {
//         User.find({ _id: userId })
//             .then((result) => {
                
//                 let current = result.find(item => item.username)
                
//                 res.render('editUser', current)
//             })
//             .catch((err) => {
//                 console.log(err)
//             })
//     }
//     else {
//         res.redirect('/admin')
//     }
// });

// router.post('/editUser/:id', function (req, res) {
//     console.log(req.params);
//     console.log(req.body);
//     console.log(req.body.oldData);
//     console.log(req.body.oldName);
//     let newUserId = req.params.id;
//     console.log(newUserId);
//     let newData;
//     adminSession = req.session;
//     if (adminSession.adminid) {
//         if (req.body.newData) {
//             User.updateOne({ _id: newUserId }, { $set: { data: req.body.newData } })
//                 .then((result) => {
                    
//                     res.redirect('/admin')
//                 })
//                 .catch((err) => {
//                     console.log(err)
//                 })
//         } else {
//             res.redirect('/admin')
//         }
//         if (req.body.newName) {
//             User.updateOne({ _id: newUserId }, { $set: { name: req.body.newName } })
//                 .then((result) => {
//                     console.log(result);
//                     res.redirect('/admin')
//                 })
//                 .catch((err) => {
//                     console.log(err)
//                 })
//         } else {
//             res.redirect('/admin')
//         }
//     } else {
//         res.redirect('/admin')
//     }
// })

// router.get('/delete/:id', function (req, res) {
//     console.log(req.params);
//     let userId = req.params.id;
//     console.log(userId);
//     adminSession = req.session
//     if (adminSession.adminid) {
//         User.deleteOne({ _id: userId })
//             .then((result) => {
//                 if (adminSession.adminid && req.body.input) {
//                     res.render('adminHome', { result })
//                 } else {
//                     res.redirect('/admin');
//                 }
//             })
//             .catch((err) => {
//                 console.log(err)
//                 // res.redirect('/admin');
//             })
//     } else {
//         res.redirect('/admin');
//     }
// });



// router.post('/adminLogout', function (req, res) {
//     adminSession=req.session
//     adminSession.adminid=false
//     adminSession.incorrect=false
//     adminSession.alreadyexist=false
//     res.redirect('/admin');
// });



// module.exports = router;