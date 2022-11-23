var db = require("../config/connection");
var collection = require("../config/collections");
var objectId = require("mongodb").ObjectId;
const bcrypt = require("bcrypt");
const { response } = require("../app");

module.exports = {
  addProduct: (product, callback) => {
    product.Stock = parseInt(product.Stock)
    console.log(product);
    db.get()
      .collection("product")
      .insertOne(product)
      .then((data) => {
        callback(product._id);
      });
  },
  getAllProducts: () => {
    return new Promise(async (resolve, reject) => {
      let products = await db
        .get()
        .collection(collection.PRODUCTS_COLLECTIONS)
        .find()
        .toArray();
      resolve(products);
    });
  },
  deleteProduct: (proId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCTS_COLLECTIONS)
        .deleteOne({ _id: objectId(proId) })
        .then((response) => {
          resolve(response);
        });
    });
  },
  getProductDetails: (proId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.PRODUCTS_COLLECTIONS)
        .findOne({ _id: objectId(proId) })
        .then((product) => {
          resolve(product);
        });
    });
  },
  updateProduct: (proId, proDetails) => {
    return new Promise((resolve, reject) => {
      proDetails.Stock = parseInt(proDetails.Stock)
      db.get()
        .collection(collection.PRODUCTS_COLLECTIONS)
        .updateOne(
          { _id: objectId(proId) },
          {
            $set: {
              Name: proDetails.Name,
              Description: proDetails.Description,
              actualPrice: proDetails.actualPrice,
              Stock: proDetails.Stock,
              Offer: proDetails.Offer,
              Price: proDetails.Price,
              // Sales: proDetails.Sales,
              Category: proDetails.Category,
            },
          }
        )
        .then((response) => {
          resolve();
        });
    });
  },
  doAdminSignup: (adminData) => {
    return new Promise(async (resolve, reject) => {
      adminData.Password = await bcrypt.hash(adminData.Password, 10);
      db.get()
        .collection(collection.ADMIN_COLLECTION)
        .insertOne(adminData)
        .then((response) => {
          resolve(adminData);
        });
    });
  },
  doAdminLogin: (adminData) => {
    return new Promise(async (resolve, reject) => {
      let loginStatus = false;
      let response = {};
      let admin = await db
        .get()
        .collection(collection.ADMIN_COLLECTION)
        .findOne({ Email: adminData.Email });
      if (admin) {
        bcrypt.compare(adminData.Password, admin.Password).then((status) => {
          if (status) {
            console.log("login success");
            response.admin = admin;
            response.status = true;
            resolve(response);
          } else {
            console.log("login failed");
            resolve({ status: false });
          }
        });
      } else {
        console.log("admin not found");
        resolve({ status: false });
      }
    });
  },
  addCategory: (catData) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CATEGORY_COLLECTION)
        .insertOne(catData)
        .then((response) => {
          resolve(catData);
        });
    });
  },
  getAllCategories: () => {
    return new Promise(async (resolve, reject) => {
      let categories = await db
        .get()
        .collection(collection.CATEGORY_COLLECTION)
        .find()
        .toArray();
      resolve(categories);
    });
  },
  deleteCategory: (catId) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.CATEGORY_COLLECTION)
        .deleteOne({ _id: objectId(catId) })
        .then((response) => {
          resolve(response);
        });
    });
  },
  getAllOrders: () => {
    return new Promise(async (resolve, reject) => {
      let orders = await db
        .get()
        .collection(collection.ORDER_COLLECTION)
        .find()
        .toArray();
      resolve(orders);
    });
  },
  updateOrderStatus: (orderId, updatedStatus) => {
    return new Promise((resolve, reject) => {
      db.get()
        .collection(collection.ORDER_COLLECTION)
        .updateOne(
          { _id: objectId(orderId) },
          { $set: { status: updatedStatus.status, FinalStatus: true } }
        )
        .then((response) => {
          resolve(response);
        });
    });
  },
  addCoupon: (couponDetails) => {
    return new Promise((resolve, reject) => {
        db.get().collection(collection.COUPON_COLLECTION).insertOne(couponDetails).then((response) => {
            resolve(couponDetails)
        })
    })
  },
  getAllCoupons: () => {
    return new Promise(async (resolve, reject) => {
       await db.get().collection(collection.COUPON_COLLECTION).find().toArray().then((response) => {
        resolve(response)
       })
    })
  },
  deleteCoupon: (couponId) => {
    return new Promise((resolve, reject) => {
        db.get().collection(collection.COUPON_COLLECTION).deleteOne({_id: objectId(couponId)}).then((response) => {
            resolve(response)
        })
    })
  },
  getTotalSalesAmount: () => {
    return new Promise(async(resolve, reject) => {
     const totalSalesAmount = await db.get().collection(collection.ORDER_COLLECTION).aggregate([{$group: {_id: null, "Amount": {$sum: "$totalAmount"}}},{$project: {_id:0, "totalAmount": "$Amount"}}]).toArray()
    resolve(totalSalesAmount[0]?.totalAmount)
    })
  },
  getTotalProducts: () => {
    return new Promise(async (resolve, reject) => {
     await db.get().collection(collection.PRODUCTS_COLLECTIONS).count().then((totalProducts) => {
       resolve(totalProducts)
     })
    })
  },
  getOrderDates: () => {
    return new Promise(async (resolve, reject) => {
      const orderDates = await db.get().collection(collection.ORDER_COLLECTION).aggregate([{$project: {_id: 0, date: 1}}]).toArray()
      timeOfSale = []
      for(let orderDate of orderDates){
        timeOfSale.push(orderDate.date.toISOString().substring(0, 10))
      }
      resolve(timeOfSale)
    })
  },
  getTotalAmount: () => {
    return new Promise(async (resolve, reject) => {
      const orderAmount = await db.get().collection(collection.ORDER_COLLECTION).aggregate([{$project: {_id: 0, totalAmount: 1}}]).toArray()
      amountOfSale = []
      for(let amount of orderAmount){
        amountOfSale.push(amount.totalAmount)
      };
      resolve(amountOfSale)
    })
  }
};
