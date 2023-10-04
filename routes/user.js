var express = require("express");
const { response } = require("../app");
var router = express.Router();
var productHelpers = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");
const { check, validationResult } = require("express-validator");
var objectId = require("mongodb").ObjectId;
var db = require("../config/connection");
var collection = require("../config/collections");
const sgMail = require("@sendgrid/mail");
const jwt = require("jsonwebtoken");

sgMail.setApiKey(process.env.sendGridApiKey);

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
    const renderProducts = JSON.stringify(products);
    res.render("user/view-products", {
      products,
      renderProducts,
      user,
      cartCount,
      userHome,
    });
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
  async (req, res, next) => {
    const userExist = await db
      .get()
      .collection(collection.USER_COLLECTION)
      .find({ Email: req.body.Email })
      .toArray();

    if (userExist.length > 0) {
      return res.render("user/signup", {
        userExistError: "User already exists",
      });
    }

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
      userHelpers.sendOtp(req.body).then((response) => {
        req.session.user = response;
        // req.session.userLoggedIn = true;
        res.redirect("/otpLoginVerify");
      });
    }
  }
);

router.get("/otpLoginVerify", (req, res) => {
  const errorMessage = req.query.error;
  res.render("user/otpLoginVerify", { errorMessage });
});

router.post("/resend-otp", (req, res) => {
  const user = req.session.user;
  userHelpers.sendOtp(user);
});

router.post("/otpLoginVerify", (req, res) => {
  const user = req.session.user;
  const otp = req.body.otp;
  userHelpers
    .otpSignupVerifyPost(user, otp)
    .then((response) => {
      req.session.user = response;
      req.session.userLoggedIn = false;
      userHelpers.doSignup(user).then((response) => {
        res.redirect("/login");
      });
    })
    .catch((error) => {
      console.log(error);
      const errorMessage = encodeURIComponent(error); // Encode the error message
      res.redirect(`/otpLoginVerify?error=${errorMessage}`);
    });
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

router.get("/forgot-password", (req, res) => {
  const errorMessage = req.query.error;
  res.render("user/forgotPassword", { errorMessage });
});

router.post("/sendResetLink", async (req, res) => {
  const emailAddress = req.body.Email;

  try {
    const user = await userHelpers.getUserByEmail(emailAddress);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET_KEY, {
      expiresIn: "1d",
    });

    const msg = {
      to: emailAddress,
      from: {
        name: "Downy Shoes",
        email: process.env.sendGridEmail,
      },
      subject: "Reset your password",
      text: `This email was sent to reset your password. For password reset, please click on this link http://localhost:3000/newPassword/${user._id}/${token}`,
    };

    await sgMail.send(msg);

    console.log("Email sent successfully");

    res.redirect('/login');
  } catch (error) {
    const errorMessage = encodeURIComponent(error); // Encode the error message

    res.redirect(`/forgot-password?error=${errorMessage}`);
  }
});

router.get("/newPassword/:userId/:token", (req, res) => {
  const userId = req.params.userId;
  const token = req.params.token;

  try {
    const verifyToken = jwt.verify(token, process.env.JWT_SECRET_KEY);

    if (verifyToken) {
      res.render("user/newPassword", { userId });
    } else {
      res.render("user/error", { title: "Page Not Found", layout: false });
    }
  } catch (error) {
    console.error("Token verification error:", error);
    res.render("user/error", { title: "Page Not Found", layout: false });
  }
});

router.post("/changePassword/:userId", (req, res) => {
  const password = req.body.Password;
  const userId = req.params.userId;
  const confirmPassword = req.body.confirmPassword;
  if (password === confirmPassword && password !== "") {
    userHelpers.updatePassword(userId, password).then((response) => {
      res.redirect("/login");
    });
  } else {
    console.log("error");
  }
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
  const renderProducts = JSON.stringify(products);
  res.render("user/cart", { products, renderProducts, user, cartCount, total });
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

  const formattedOrderDates = allOrders.map((orders) => {
     const date = new Date();

      // Define date format options
      const options = {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        // second: "2-digit",
        hour12: true, // Use 12-hour format
      };

      // Format the date
      const formattedDate = new Intl.DateTimeFormat("en-US", options).format(
        orders.date
      );
      orders.date = formattedDate;

  })
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
