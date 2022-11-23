var db = require("../config/connection");
var collection = require("../config/collections");
const bcrypt = require("bcrypt");
const { response } = require("../app");
const { CART_COLLECTION } = require("../config/collections");
var objectId = require("mongodb").ObjectId;
const dotenv = require("dotenv").config();
const client = require("twilio")(process.env.accountSid, process.env.authToken);
const Razorpay = require("razorpay");
const { resolve } = require("node:path");

var instance = new Razorpay({
  key_id: "rzp_test_tofGvmp2BOkbs9",
  key_secret: "i9kuGb5IsGDSYSzerLBZpl18",
});

module.exports = {
  doSignup: (userData) => {
    return new Promise(async (resolve, reject) => {
      userData.userBlocked = false;
      userData.Password = await bcrypt.hash(userData.Password, 10);
      client.verify
        .services(process.env.serviceID)
        .verifications.create({
          to: `+91${userData.Mobilenumber}`,
          channel: "sms",
        })
        .then((data) => {
          (Name1 = userData.Name),
            (Mobilenumber1 = userData.Mobilenumber),
            (Password1 = hashPassword),
            (Email1 = userData.Email);
          res.redirect("/otpSignupVerify");
        });
      db.get()
        .collection(collection.USER_COLLECTION)
        .insertOne(userData)
        .then((response) => {
          resolve(userData);
        });
    });
  },
  otpSignupVerifyPost: (req, res) => {
    if (req.body.otp.length === 6) {
      client.verify
        .services(process.env.serviceID)
        .verificationChecks.create({
          to: `+91${Mobilenumber1}`,
          code: req.body.otp,
        })
        .then((data) => {
          if (data.status === "approved") {
            const user = new User({
              Name: Name1,
              Mobilenumber: Mobilenumber1,
              Email: Email1,
              Password: Password1,
            });
            user
              .save()
              .then((result) => {
                console.log("otp signup successful");
              })
              .catch((err) => {
                console.log(err);
              });
            res.redirect("/");
          } else {
            session = req.session;
            session.invalidOTP = true;
            res.redirect("/otpLoginVerify");
          }
        });
    } else {
      session = req.session;
      session.invalidOTP = true;
      res.redirect("/otpLoginVerify");
    }
  },

  doLogin: (userData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let user = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .findOne({ Email: userData.Email });
      if (user && !user.userBlocked) {
        bcrypt.compare(userData.Password, user.Password).then((status) => {
          if (status) {
            response.user = user;
            response.status = true;
            resolve(response);
          } else {
            resolve({ status: false });
          }
        });
      } else {
        resolve({ status: false });
      }
    });
  },
  getAllUsers: () => {
    return new Promise(async (resolve, reject) => {
      let users = await db
        .get()
        .collection(collection.USER_COLLECTION)
        .find()
        .toArray();
      resolve(users);
    });
  },
  blockUser: (userId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objectId(userId) },
          {
            $set: {
              userBlocked: true,
            },
          }
        )
        .then((response) => {
          console.log(userId);
          resolve(response);
        });
    });
  },
  unblockUser: (user) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objectId(user) },
          {
            $set: {
              userBlocked: false,
            },
          }
        )
        .then((response) => {});
    });
  },
  addToCart: (proId, userId) => {
    let proObj = {
      item: objectId(proId),
      quantity: 1,
    };
    return new Promise(async (resolve, reject) => {
      let userCart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (userCart) {
        let proExist = userCart.products.findIndex(
          (product) => product.item == proId
        );
        if (proExist != -1) {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId), "products.item": objectId(proId) },
              {
                $inc: { "products.$.quantity": 1 },
              }
            )
            .then(() => {
              resolve();
            });
        } else {
          db.get()
            .collection(collection.CART_COLLECTION)
            .updateOne(
              { user: objectId(userId) },
              {
                $push: { products: proObj },
              }
            )
            .then((response) => {
              resolve();  
            });
        }
      } else {
        let cartobj = {
          user: objectId(userId),
          products: [proObj],
        };
        db.get()
          .collection(collection.CART_COLLECTION)
          .insertOne(cartobj)
          .then((response) => {
            resolve();
          });
      }
    });
  },
  getCartProducts: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cartItems = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCTS_COLLECTIONS,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      resolve(cartItems);
    });
  },
  getCartCount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let count = 0;
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      if (cart) {
        count = cart.products.length;
      }
      resolve(count);
    });
  },
  changeProductQuantity: (details) => {
    console.log(details);
    details.count = parseInt(details.count);
    details.quantity = parseInt(details.quantity);

    return new Promise((resolve, reject) => {
      if (details.count == -1 && details.quantity == 1) {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            { _id: objectId(details.cart) },
            {
              $pull: { products: { item: objectId(details.product) } },
            }
          )
          .then((response) => {
            resolve({ removeProduct: true });
          });
      } else {
        db.get()
          .collection(collection.CART_COLLECTION)
          .updateOne(
            {
              _id: objectId(details.cart),
              "products.item": objectId(details.product),
            },
            {
              $inc: { "products.$.quantity": details.count },
            }
          )
          .then((response) => {
            resolve({ status: true });
          });
      }
    });
  },
  removeItem: (details) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CART_COLLECTION)
        .updateOne(
          { _id: objectId(details.cart) },
          {
            $pull: { products: { item: objectId(details.product) } },
          }
        )
        .then((response) => {
          resolve({ removeProduct: true });
        });
    });
  },
  getTotalAmount: (userId) => {
    return new Promise(async (resolve, reject) => {
      let total = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .aggregate([
          {
            $match: { user: objectId(userId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCTS_COLLECTIONS,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
          {
            $group: {
              _id: null,
              total: {
                $sum: {
                  $multiply: ["$quantity", { $toInt: "$product.Price" }],
                },
              },
            },
          },
        ])
        .toArray();
      resolve(total[0]?.total);
    });
  },
  placeOrder: (order, products, total) => {
    return new Promise((resolve, reject) => {
      // let d = new Date().toString()
      // let index = d.lastIndexOf(":")+3
      // let date = (d.substring(0, index))

      let status = order["payment-method"] === "COD" ? "placed" : "pending";
      let orderObj = {
        deliveryDetails: {
          Name: order.Name,
          Mobile: order.Mobile,
          Landmark: order.Landmark,
          City: order.City,
          Pincode: order.Pincode,
        },
        userId: objectId(order.userId),
        paymentMethod: order["payment-method"],
        products: products,
        totalAmount: total,
        status: status,
        date: new Date(),
        FinalStatus: false,
      };

      // db.get()
      //   .collection(collection.USER_COLLECTION)
      //   .updateOne(
      //     { _id: objectId(order.userId) },
      //     { $push: { address: orderObj.deliveryDetails } }
      //   )
      //   .then((response) => {
      //     resolve();
      //   });

      db.get()
        .collection(collection.ORDER_COLLECTION)
        .insertOne(orderObj)
        .then((response) => {
          db.get()
            .collection(collection.CART_COLLECTION)
            .deleteOne({ user: objectId(order.userId) });
          resolve(response.insertedId);
        });
    });
  },
  getCartProductList: (userId) => {
    return new Promise(async (resolve, reject) => {
      let cart = await db
        .get()
        .collection(collection.CART_COLLECTION)
        .findOne({ user: objectId(userId) });
      resolve(cart.products);
    });
  },
  getAllOrders: (userId) => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find({ userId: objectId(userId) })
        .toArray();
      resolve(orders);
    });
  },
  getOrderedItems: (orderId) => {
    return new Promise(async (resolve, reject) => {
      let orderItems = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .aggregate([
          {
            $match: { _id: objectId(orderId) },
          },
          {
            $unwind: "$products",
          },
          {
            $project: {
              item: "$products.item",
              quantity: "$products.quantity",
            },
          },
          {
            $lookup: {
              from: collection.PRODUCTS_COLLECTIONS,
              localField: "item",
              foreignField: "_id",
              as: "product",
            },
          },
          {
            $project: {
              item: 1,
              quantity: 1,
              product: { $arrayElemAt: ["$product", 0] },
            },
          },
        ])
        .toArray();
      resolve(orderItems);
    });
  },
  cancelOrder: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          { $set: { status: "cancelled", FinalStatus: true } }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },
  generateRazorpay: (orderId, total) => {
    return new Promise((resolve, reject) => {
      var options = {
        amount: total * 100,
        currency: "INR",
        receipt: "" + orderId,
      };

      instance.orders.create(options, function (err, order) {
        if (err) {
          console.log(err);
        } else {
          resolve(order);
        }
      });
    });
  },
  verifyPayment: (details) => {
    return new Promise((resolve, reject) => {
      const { createHmac } = require("node:crypto");
      let hmac = createHmac("sha256", "i9kuGb5IsGDSYSzerLBZpl18");

      hmac.update(
        details["payment[razorpay_order_id]"] +
          "|" +
          details["payment[razorpay_payment_id]"]
      );
      hmac = hmac.digest("hex");
      if (hmac == details["payment[razorpay_signature]"]) {
        resolve();
      } else {
        reject();
      }
    });
  },
  changePaymentStatus: (orderId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne({ _id: objectId(orderId) }, { $set: { status: "placed" } })
        .then(() => {
          resolve();
        });
    });
  },
  redeemCode: (couponCode) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.COUPON_COLLECTION)
        .findOne({ Coupon: couponCode.Coupon })
        .then((response) => {
          resolve(response);
        });
    });
  },
  useCoupon: (userId, couponCode) => {
    return new Promise((resolve, reject) => {
      console.log(couponCode);
      db.get().collection(collection.COUPON_COLLECTION).updateOne({ Coupon: couponCode.Coupon}, {$push: {usedBy: objectId(userId)}})
    })
  },
  getUserDetails: (user) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .findOne({ _id: objectId(user._id) })
        .then((userDetails) => {
          resolve(userDetails);
        });
    });
  },
  addNewAddress: (addressData, user) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.USER_COLLECTION)
        .updateOne(
          { _id: objectId(user._id) },
          { $push: { address: addressData } }
        )
        .then((response) => {
          resolve();
        });
    });
  },
  getTotalUsers: () => {
    return new Promise(async (resolve, reject) => {
      await db.get().collection(collection.USER_COLLECTION).count().then((response) => {
        resolve(response)
      })
    })
  },
  getTotalOrders: () => {
    return new Promise(async (resolve, reject) => {
      await db.get().collection(collection.ORDER_COLLECTION).count().then((response) => {
        resolve(response)
      })
    })
  },
  updateSales: (products) => {    
    return new Promise((resolve, reject) => {
      products.forEach((value, index) => {
          const proId = products[index].item
        db.get().collection(collection.PRODUCTS_COLLECTIONS).updateOne({_id: proId}, {$inc: {Sales: value.quantity, Stock: -value.quantity}})
      })
    });
  }
};
