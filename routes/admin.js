var express = require("express");
const { response } = require("../app");
const productHelpers = require("../helpers/product-helpers");
// const {render} = require('../app');
var router = express.Router();
var productHelper = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");

const verifyLogin = (req, res, next) => {
  if (req.session.adminLoggedIn) {
    next();
  } else {
    res.redirect("/admin");
  }
};

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.render("admin/adminLogin", {
    loginErr: req.session.adminLoginErr,
    // admin: true,
    layout: "adminLayout.hbs",
  });
  req.session.adminLoginErr = false;
});

router.get("/adminSignup", function (req, res, next) {
  res.render("admin/adminSignup", { layout: "adminLayout.hbs" });
});

router.post("/adminSignup", (req, res) => {
  productHelpers.doAdminSignup(req.body).then((response) => {
    req.session.adminLoggedIn = true;
    req.session.admin = response;
    res.redirect("/admin");
  });
});

router.get("/adminHome", verifyLogin, (req, res, next) => {
  const admin = req.session.admin;
  productHelpers.getTotalSalesAmount().then((totalSalesAmount) => {
    productHelpers.getTotalProducts().then((totalProducts) => {
      userHelpers.getTotalUsers().then((totalUsers) => {
        userHelpers.getTotalOrders().then((totalOrders) => {
          productHelper.getAllProducts().then((products) => {
            productHelpers.getOrderDates().then((timeOfSale) => {
              productHelpers.getTotalAmount().then((amountOfSale) => {
                console.log(amountOfSale);
                res.render("admin/adminHome", {
                  admin,
                  layout: "adminLayout.hbs",
                  totalUsers,
                  totalSalesAmount,
                  totalProducts,
                  totalOrders,
                  products,
                  timeOfSale,
                  amountOfSale
                });
              });
            });
          });
        });
      });
    });
  });
});

router.post("/adminHome", (req, res) => {
  productHelpers.doAdminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin;
      req.session.adminLoggedIn = true;
      res.redirect("/admin/adminHome");
    } else {
      req.session.adminLoginErr = "Invalid username or password";
      res.redirect("/admin");
    }
  });
});

router.get("/view-products", verifyLogin, function (req, res) {
  const admin = req.session.admin;
  productHelper.getAllProducts().then((products) => {
    console.log(products);
    res.render("admin/view-products", {
      admin,
      products,
      layout: "adminLayout.hbs",
    });
  });
});

router.get("/view-users", verifyLogin, function (req, res) {
  const admin = req.session.admin;
  userHelpers.getAllUsers().then((users) => {
    res.render("admin/view-users", {
      admin,
      users,
      layout: "adminLayout.hbs",
    });
  });
});

router.get("/block-user/:id", async (req, res) => {
  userHelpers.blockUser(req.params.id);
  res.redirect("/admin/view-users");
});

router.get("/unblock-user/:id", async (req, res) => {
  userHelpers.unblockUser(req.params.id);
  res.redirect("/admin/view-users");
});

router.get("/add-product", verifyLogin, function (req, res) {
  const admin = req.session.admin;
  productHelpers.getAllCategories().then((categories) => {
    res.render("admin/add-product", {
      admin,
      categories,
      layout: "adminLayout.hbs",
    });
  });
});

router.post("/add-product", (req, res) => {
  const discount = (req.body.actualPrice * req.body.Offer) / 100;
  const Price = req.body.actualPrice - discount;
  req.body.Price = Price.toFixed();
  req.body.Sales = 0;
  productHelpers.addProduct(req.body, (id) => {
    let image = req.files.Image;
    console.log(id);
    image.mv("./public/product-images/" + id + ".jpg", (err) => {
      if (!err) {
        res.redirect("/admin/view-products");
      } else {
        console.log(err);
      }
    });
  });
});

router.get("/delete-product/:id", (req, res) => {
  let proId = req.params.id;
  productHelpers.deleteProduct(proId).then((response) => {
    res.redirect("/admin/view-products");
  });
});

router.get("/edit-product", verifyLogin, async (req, res) => {
  let proId = req.query.id;
  let product = await productHelpers.getProductDetails(proId);
  productHelpers.getAllCategories().then((categories) => {
    res.render("admin/edit-product", {
      product,
      categories,
      layout: "adminLayout.hbs",
    });
  });
});

router.post("/edit-product/:id", (req, res) => {
  let id = req.params.id;
  const discount = (req.body.actualPrice * req.body.Offer) / 100;
  const Price = req.body.actualPrice - discount;
  req.body.Price = Price.toFixed();
  console.log(Price);
  // req.body.Sales = 0

  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect("/admin/view-products");
    if (req.files) {
      let image = req.files.Image;
      image.mv("./public/product-images/" + id + ".jpg");
    }
  });
});

router.get("/adminLogout", function (req, res) {
  adminSession = req.session;
  adminSession.adminid = false;
  adminSession.incorrect = false;
  adminSession.alreadyexist = false;
  res.redirect("/admin");
});

router.get("/add-categories", verifyLogin, (req, res) => {
  const admin = req.session.admin;
  productHelpers.getAllCategories().then((categories) => {
    res.render("admin/add-categories", {
      admin,
      categories,
      layout: "adminLayout.hbs",
    });
  });
});

router.post("/add-categories", (req, res) => {
  productHelpers.addCategory(req.body).then((response) => {
    res.redirect("/admin/add-categories");
  });
});

router.get("/delete-category/:id", (req, res) => {
  let catId = req.params.id;
  productHelpers.deleteCategory(catId).then((response) => {
    res.redirect("/admin/add-categories");
  });
});

router.get("/view-orders", verifyLogin, (req, res) => {
  const admin = req.session.admin;
  productHelpers.getAllOrders().then((orders) => {
    res.render("admin/view-orders", {
      admin,
      orders,
      layout: "adminLayout.hbs",
    });
  });
});

router.post("/view-orders/:id", (req, res) => {
  const orderId = req.params.id;
  productHelpers.updateOrderStatus(orderId, req.body).then((response) => {
    res.redirect("/admin/view-orders");
  });
});

router.get("/add-coupons", verifyLogin, (req, res) => {
  const admin = req.session.admin;
  productHelpers.getAllCoupons().then((allCoupons) => {
    res.render("admin/add-coupons", {
      admin,
      allCoupons,
      layout: "adminLayout.hbs",
    });
  });
});

router.post("/add-coupons", (req, res) => {
  productHelpers.addCoupon(req.body).then((response) => {
    res.redirect("/admin/add-coupons");
  });
});

router.get("/delete-coupon/:id", (req, res) => {
  const couponId = req.params.id;
  productHelpers.deleteCoupon(couponId).then((response) => {
    res.redirect("/admin/add-coupons");
  });
});

module.exports = router;
