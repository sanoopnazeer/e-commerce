var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
var exphbs = require('express-handlebars');
var fileUpload = require('express-fileupload');
var db = require('./config/connection')
var session = require('express-session')

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
const hbs = exphbs.create({
  helpers: {
    addOne: (index) => index + 1, // Custom helper to increment by 1
  },
  extname: '.hbs', 
  defaultLayout: 'layout',
  layoutsDir: __dirname + '/views/layout/',
  partialsDir: __dirname + '/views/partials/',
});
app.set('view engine', 'hbs');
app.engine('hbs', hbs.engine)

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());
app.use(session({secret:'key', cookies:{maxAge:600000}}))

db.connect((err) => {
  if(err) console.log("Connection Error"+err);
  else console.log("Database Connected to PORT 27017");
})

app.use('/', userRouter);
app.use('/admin', adminRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
res.render('user/error', {title: "Page Not found", layout: false})});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
