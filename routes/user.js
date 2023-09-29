var express = require("express");
const { response } = require("../app");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");
const { check, validationResult } = require("express-validator");
var objectId = require("mongodb").ObjectId;

const verifyLogin = (req, res, next) => {
  if (req.session.userLoggedIn) {
    next();
  } else {
    res.redirect("/login");
  }
};

/* GET home page. */
router.get("/", async function (req, res, next) {
  const userHome = true;
  let user = req.session.user;
  let cartCount = null;
  if (req.session.user) {
    cartCount = await userHelpers.getCartCount(req.session.user._id);
  }
  productHelpers.getAllProducts().then((products) => {
    const renderProducts = JSON.stringify(products)

    console.log(renderProducts)
    res.render("user/view-products", { products, renderProducts, user, cartCount, userHome });
  });
});

router.get("/login", function (req, res, next) {
  if (req.session.userLoggedIn) {
    res.redirect("/");
  } else {
    res.render("user/login", { loginErr: req.session.userLoginErr });
    req.session.userLoginErr = false;
  }
});

router.get("/signup", function (req, res, next) {
  res.render("user/signup");
});

router.post(
  "/signup",
  check("Name").notEmpty().withMessage("Please enter a Name"),
  check("Email").notEmpty().withMessage("Please enter a username"),
  check("Email")
    .matches(/^\w+([\._]?\w+)?@\w+(\.\w{2,3})(\.\w{2})?$/)
    .withMessage("Username must be a valid email id"),
  check("Password")
    .matches(/[\w\d!@#$%^&*?]{8,}/)
    .withMessage("Password must contain at least eight characters"),
  check("Password")
    .matches(/[a-z]/)
    .withMessage("Password must contain at least one lowercase letter"),
  check("Password")
    .matches(/[A-Z]/)
    .withMessage("Password must contain at least one uppercase letter"),
  check("Password")
    .matches(/\d/)
    .withMessage("Password must contain at least one number"),
  check("Password")
    .matches(/[!@#$%^&*?]/)
    .withMessage("Password must contain at least one special character"),
  (req, res, next) => {
    const errors = validationResult(req);
    console.log(errors);
    var error1 = errors.errors.find((item) => item.param === "Name") || "";
    var error2 = errors.errors.find((item) => item.param === "Email") || "";
    var error3 = errors.errors.find((item) => item.param === "Password") || "";
    console.log(error3.msg);
    if (!errors.isEmpty()) {
      let errors = {
        nameMsg: error1.msg,
        usernameMsg: error2.msg,
        pwdMsg: error3.msg,
      };
      res.render("user/signup", { errors });
    } else {
      userHelpers.doSignup(req.body).then((response) => {
        req.session.user = response;
        req.session.userLoggedIn = true;
        res.redirect("/otpLoginVerify");
      });
    }
  }
);

router.get("/otpLoginVerify", (req, res) => {
  res.render("user/otpLoginVerify");
});

router.post("/otpLoginVerify", (req, res) => {
  userHelpers.otpSignupVerifyPost(req, res);
  req.session.user = response;
  req.session.userLoggedIn = false;
  res.redirect("/login");
});

router.post("/login", (req, res) => {
  userHelpers.doLogin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user;
      req.session.userLoggedIn = true;
      res.redirect("/");
    } else {
      req.session.userLoginErr = "Invalid username or password";
      res.redirect("/login");
    }
  });
});

router.get("/logout", (req, res) => {
  req.session.user = null;
  req.session.userLoggedIn = false;
  res.redirect("/");
});

router.get("/cart", verifyLogin, async (req, res) => {
  let products = await userHelpers.getCartProducts(req.session.user._id);
  let total = 0;
  if (products.length > 0) {
    total = await userHelpers.getTotalAmount(req.session.user._id);
  }
  let user = req.session.user;
  cartCount = await userHelpers.getCartCount(req.session.user._id);
  res.render("user/cart", { products, user, cartCount, total });
});

router.get("/add-to-cart/:id", (req, res) => {
  userHelpers.addToCart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true });
  });
});

router.get("/single", async (req, res) => {
  try {
    if (req.session.user) {
      let user = req.session.user;
      let proId = req.query.id;
      cartCount = await userHelpers.getCartCount(req.session.user._id);
      let product = await productHelpers.getProductDetails(proId);
      res.render("user/single", { product, user, cartCount });
    }
    console.log(req.params.id);
    let proId = req.query.id;
    let product = await productHelpers.getProductDetails(proId);
    res.render("user/single", { product });
  } catch (err) {
    res.render("user/error", { title: "Page Not found", layout: false });
  }
});

router.get("/about", (req, res) => {
  res.render("user/about");
});

router.get("/contact", (req, res) => {
  res.render("user/contact");
});

router.post("/change-product-quantity", (req, res, next) => {
  userHelpers.changeProductQuantity(req.body).then(async (response) => {
    response.total = await userHelpers.getTotalAmount(req.body.user);
    res.json(response);
  });
});

router.post("/remove-item", (req, res) => {
  userHelpers.removeItem(req.body).then((response) => {
    res.json(response);
  });
});

router.get("/place-order", async (req, res) => {
  let user = req.session.user;
  cartCount = await userHelpers.getCartCount(req.session.user._id);
  let subTotal = await userHelpers.getTotalAmount(req.session.user._id);
  let products = await userHelpers.getCartProducts(req.session.user._id);
  const coupons = await productHelpers.getAllCoupons();
  const userDetails = await userHelpers.getUserDetails(user);
  console.log(userDetails);
  res.render("user/place-order", {
    user,
    cartCount,
    subTotal,
    products,
    coupons,
    userDetails: userDetails.address,
  });
});

router.post("/place-order", async (req, res) => {
  let products = await userHelpers.getCartProductList(req.body.userId);
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId);
  if (discountPrice > 0) {
    userHelpers
      .placeOrder(req.body, products, discountPrice)
      .then((orderId) => {
        userHelpers.useCoupon(req.body.userId, couponCode);
        userHelpers.updateSales(products);
        if (req.body["payment-method"] === "COD") {
          res.json({ codSuccess: true });
        } else {
          userHelpers
            .generateRazorpay(orderId, discountPrice)
            .then((response) => {
              res.json(response);
            });
        }
      });
  } else {
    userHelpers.placeOrder(req.body, products, totalPrice).then((orderId) => {
      userHelpers.updateSales(products);
      if (req.body["payment-method"] === "COD") {
        res.json({ codSuccess: true });
      } else {
        userHelpers.generateRazorpay(orderId, totalPrice).then((response) => {
          res.json(response);
        });
      }
    });
  }
});

router.get("/order-successful", (req, res) => {
  const user = req.session.user;
  res.render("user/orderSuccessful", { user });
});

router.get("/view-orders", async (req, res) => {
  const user = req.session.user;
  cartCount = await userHelpers.getCartCount(req.session.user._id);
  const allOrders = await userHelpers.getAllOrders(req.session.user._id);
  res.render("user/view-orders", { user, allOrders, cartCount });
});

router.get("/view-ordered-items", async (req, res) => {
  const user = req.session.user;
  const orderId = req.query.id;
  const products = await userHelpers.getOrderedItems(orderId);
  res.render("user/view-ordered-items", { user, products, orderId });
});

router.get("/cancel-order/:id", (req, res) => {
  console.log(req.params.id);
  userHelpers.cancelOrder(req.params.id).then((response) => {
    res.redirect("/view-orders");
  });
});

router.post("/verify-payment", (req, res) => {
  console.log(req.body);
  userHelpers
    .verifyPayment(req.body)
    .then(() => {
      userHelpers.changePaymentStatus(req.body["order[receipt]"]).then(() => {
        console.log("Payment Successful");
        res.json({ status: true });
      });
    })
    .catch((err) => {
      console.log(err);
      res.json({ status: false, errMsg: "" });
    });
});

let discountPrice;
let couponCode;
router.post("/redeem-code", async (req, res) => {
  let userId = req.body.userId;
  let totalPrice = await userHelpers.getTotalAmount(req.body.userId);
  couponCode = req.body;
  userHelpers.redeemCode(couponCode).then((couponDetails) => {
    if (couponDetails.usedBy) {
      console.log("inside loop");
      let n = 0;
      for (userObj of couponDetails.usedBy) {
        console.log(couponDetails.usedBy);
        console.log(userObj.user);
        if (userObj.user == userId) {
          n++;
        }
      }
      if (n > 0) {
        res.json({ errMsg: "Coupon already used" });
      } else {
        console.log("else for loop");
        let discount = couponDetails.Discount;
        let MinPrice = couponDetails.MinPrice;
        if (totalPrice >= couponDetails.MinPrice) {
          discountPrice = totalPrice - couponDetails.Discount;
          res.json({
            status: true,
            discountPrice,
            discount,
            errMsg: "Discount applied",
          });
        } else {
          res.json({ errMsg: "Purchase more to apply coupon" });
        }
      }
    } else {
      console.log("inside else usedby");
      let discount = couponDetails.Discount;
      let MinPrice = couponDetails.MinPrice;
      if (totalPrice >= couponDetails.MinPrice) {
        discountPrice = totalPrice - couponDetails.Discount;
        res.json({
          status: true,
          discountPrice,
          discount,
          errMsg: "Discount applied",
        });
      } else {
        res.json({ errMsg: "Purchase more to apply coupon" });
      }
    }
  });
});

router.get("/view-profile", async (req, res) => {
  const user = req.session.user;
  cartCount = await userHelpers.getCartCount(req.session.user._id);
  const userDetails = await userHelpers.getUserDetails(user);
  res.render("user/view-profile", { user, userDetails, cartCount });
});

router.post("/add-address", (req, res) => {
  const user = req.session.user;
  userHelpers.addNewAddress(req.body, user).then((response) => {
    res.redirect("/view-profile");
  });
});

router.post("/select-address", (req, res) => {
  const address = req.body;
  console.log("before true");
  console.log(response);
  console.log(address);
  res.json(response);
});

module.exports = router;
