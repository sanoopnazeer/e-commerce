var express = require("express");
const { response } = require("../app");
const productHelpers = require("../helpers/product-helpers");
// const {render} = require('../app');
var router = express.Router();
var productHelper = require("../helpers/product-helpers");
const userHelpers = require("../helpers/user-helpers");

const verifyLogin = (req, res, next) => {
  if (req.session.admin.loggedIn) {
    next();
  } else {
    res.redirect("/adminLogin");
  }
};

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.render("admin/adminLogin", {
    loginErr: req.session.adminLoginErr,
    admin: true,
  });
  req.session.adminLoginErr = false;
});

router.get("/adminSignup", function (req, res, next) {
  res.render("admin/adminSignup", { admin: true });
});

router.post("/adminSignup", (req, res) => {
  productHelpers.doAdminSignup(req.body).then((response) => {
    req.session.adminLoggedIn = true;
    req.session.admin = response;
    res.redirect("/admin");
  });
});

router.post("/adminLogin", (req, res) => {
  productHelpers.doAdminLogin(req.body).then((response) => {
    if (response.status) {
      req.session.admin = response.admin;
      req.session.admin.loggedIn = true;
      res.render("admin/adminHome", { admin: true });
    } else {
      req.session.adminLoginErr = "Invalid username or password";
      res.redirect("/admin");
    }
  });
});

router.get("/view-products", function (req, res) {
  productHelper.getAllProducts().then((products) => {
    console.log(products);
    res.render("admin/view-products", { admin: true, products });
  });
});

router.get("/view-users", function (req, res) {
  userHelpers.getAllUsers().then((users) => {
    res.render("admin/view-users", { admin: true, users });
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

router.get("/add-product", function (req, res) {
  productHelpers.getAllCategories().then((categories) => {
    res.render("admin/add-product", { admin: true, categories });
  })
});

router.post("/add-product", (req, res) => {
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

router.get("/edit-product/:id", async (req, res) => {
  let product = await productHelpers.getProductDetails(req.params.id);
  res.render("admin/edit-product", { product });
});

router.post("/edit-product/:id", (req, res) => {
  let id = req.params.id;
  productHelpers.updateProduct(req.params.id, req.body).then(() => {
    res.redirect("/admin/view-products");
    if (req.files.Image) {
      let image = req.files.Image;
      image.mv("./public/product-images/" + id + ".jpg");
    }
  });
});

router.post("/adminLogout", function (req, res) {
  adminSession = req.session;
  adminSession.adminid = false;
  adminSession.incorrect = false;
  adminSession.alreadyexist = false;
  res.redirect("/admin");
});

router.get("/add-categories", (req, res) => {
  productHelpers.getAllCategories().then((categories) => {
      res.render("admin/add-categories", {admin: true, categories});
  });
});

router.post("/add-categories", (req, res) => {
  productHelpers.addCategory(req.body).then((response) => {
    res.redirect("/admin/add-categories");
  });
});

router.get('/delete-category/:id', (req, res) => {
  let catId = req.params.id
  productHelpers.deleteCategory(catId).then((response) => {
    res.redirect('/admin/add-categories')
  })
})

module.exports = router;
