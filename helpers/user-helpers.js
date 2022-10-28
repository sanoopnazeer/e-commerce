var db = require('../config/connection')
var collection = require('../config/collections')
const bcrypt = require('bcrypt')
const { response } = require('../app')
var objectId = require('mongodb').ObjectId
const dotenv = require('dotenv').config()
const client = require('twilio')(process.env.accountSid,process.env.authToken)

module.exports = {
    doSignup: (userData) => {
        return new Promise(async(resolve, reject) => {
            userData.userBlocked = false
            userData.Password = await bcrypt.hash(userData.Password, 10)
            client
        .verify
        .services(process.env.serviceID)
        .verifications
        .create({
            to: `+91${userData.Mobilenumber}`,
            channel: 'sms'
        })
        .then((data) => {
            Name1 = userData.Name,
            Mobilenumber1 = userData.Mobilenumber,
            Password1 = hashPassword,
            Email1 = userData.Email
            res.redirect('/otpSignupVerify')
        })
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((response) => {
                resolve(userData)
            })
        })
    },
    otpSignupVerifyPost:(req,res)=>{
        if((req.body.otp).length === 6){
        client
        .verify
        .services(process.env.serviceID)
        .verificationChecks
        .create({
            to:`+91${Mobilenumber1}`,
            code:req.body.otp
        })
        .then((data)=>{
            if(data.status==="approved"){
                const user=new User({
                    Name:Name1,
                    Mobilenumber:Mobilenumber1,
                    Email:Email1,
                    Password:Password1
        
                })
                user.save()
                .then((result)=>{
                    console.log("otp signup successful")
                })
                .catch((err)=>{
                    console.log(err)
                })
                res.redirect('/')
            }else{
                session=req.session;
                session.invalidOTP=true
                res.redirect('/otpLoginVerify')
            }
        })
        }else{
            session=req.session;
            session.invalidOTP=true
            res.redirect('/otpLoginVerify')
        
        }
        },

    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            let loginStatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({Email: userData.Email});
            if(user && !user.userBlocked){
                bcrypt.compare(userData.Password, user.Password).then((status) => {
                    if(status){
                        response.user = user;
                        response.status = true;
                        resolve(response)
                    }else{
                        resolve({status : false})
                    }
                })
            }else{
                resolve({status : false})
            }
        })
    },
    getAllUsers:() => {
        return new Promise(async(resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray();
            resolve(users);
        })
    },
    blockUser: (userId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION)
            .updateOne({_id:objectId(userId)}, {
                $set: {
                    userBlocked: true
                }
            }).then((response) => {
                console.log(userId);
            resolve(response)
            })
        })
    },
    unblockUser:(user) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.USER_COLLECTION)
            .updateOne({_id:objectId(user)}, {
                $set: {
                    userBlocked: false
                }
            }).then((response) => {
            })
        })
    },
    addToCart: (proId, userId) => {
        return new Promise(async(resolve, reject) => {
            let userCart = await db.get().collection(collection.CART_COLLECTION).findOne({user: objectId(userId)})
            if(userCart){
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({user: objectId(userId)}, 
                    {
                        $push: {products: objectId(proId)}
                    }
                ).then((response) => {
                    resolve()
                })       
            }else{
                let cartobj = {
                    user:objectId(userId),
                    products:[objectId(proId)]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartobj).then((response) => {
                    resolve();
                })
            }
        })
    },
    getCartProducts: (userId) => {
        return new Promise(async(resolve, reject) =>{
            let cartItems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: {user: objectId(userId)} 
                },
                {
                    $lookup: {
                        from: collection.PRODUCTS_COLLECTIONS,
                        let: {prodList: '$products'},
                        pipeline:[
                            {
                                $match: {
                                    $expr: {
                                        $in: ['$_id',"$$prodList"]
                                    } 
                                }
                            }
                        ],
                        as: 'cartItems'
                    }
                }    
            ]).toArray()
            resolve(cartItems[0].cartItems)
        })
    }
}