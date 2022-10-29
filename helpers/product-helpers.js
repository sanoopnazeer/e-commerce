var db = require('../config/connection')
var collection = require('../config/collections');
var objectId = require('mongodb').ObjectId
const bcrypt = require('bcrypt');
const { response } = require('../app');

module.exports = {
    
    addProduct:(product, callback) => {
        console.log(product);
        db.get().collection('product').insertOne(product).then((data)=>{
            callback(product._id)
        })
    },
    getAllProducts:() => {
        return new Promise(async(resolve, reject) => {
            let products = await db.get().collection(collection.PRODUCTS_COLLECTIONS).find().toArray();
            resolve(products);
        })
    },
    deleteProduct:(proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCTS_COLLECTIONS).deleteOne({_id:objectId(proId)}).then((response) => {
                resolve(response)
            })
        })
    },
    getProductDetails:(proId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCTS_COLLECTIONS).findOne({_id:objectId(proId)}).then((product) => {
                resolve(product)
            })
        })
    },
    updateProduct:(proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCTS_COLLECTIONS)
            .updateOne({_id:objectId(proId)}, {
                $set: {
                    Name: proDetails.Name,
                    Description: proDetails.Description,
                    Price: proDetails.Price,
                    Category: proDetails.Category
                }
            }).then((response) => {
                resolve()
            })
        })
    },
    doAdminSignup: (adminData) => {
        return new Promise(async(resolve, reject) => {
            adminData.Password = await bcrypt.hash(adminData.Password, 10)
            db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData).then((response) => {
                resolve(adminData)
            })
        })
    },
    doAdminLogin:(adminData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({Email: adminData.Email});
            if(admin){
                bcrypt.compare(adminData.Password, admin.Password).then((status) => {
                    if(status){
                        console.log("login success");
                        response.admin = admin
                        response.status = true
                        resolve(response)
                    }else{
                        console.log("login failed");
                        resolve({status : false})
                    }
                })
            }else{
                console.log("admin not found");
                resolve({status : false})
            }
        })
    },
    addCategory: (catData) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).insertOne(catData).then((response) => {
                resolve(catData)
            })
        })
    },
    getAllCategories: () => {
        return new Promise(async(resolve, reject) => {
           let categories = await db.get().collection(collection.CATEGORY_COLLECTION).find().toArray();
           resolve(categories)
        })
    },
    deleteCategory: (catId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.CATEGORY_COLLECTION).deleteOne({_id:objectId(catId)}).then((response) => {
                resolve(response)
            })
        })
    }
}