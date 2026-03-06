var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
let mongoose = require('mongoose')


var app = express();

// view engine setup (optional; API mainly returns JSON)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//domain:port/api/v1/products
//domain:port/api/v1/users
//domain:port/api/v1/categories
//domain:port/api/v1/roles



mongoose.set('bufferCommands', false);
mongoose.connect('mongodb://localhost:27017/NNPTUD-C6', {
  serverSelectionTimeoutMS: 5000
}).catch(function (err) {
  console.log("mongo_connect_failed", err && err.message ? err.message : err);
});
mongoose.connection.on('connected', function () {
  console.log("connected");
})
mongoose.connection.on('disconnected', function () {
  console.log("disconnected");
})
mongoose.connection.on('error', function (err) {
  console.log("mongo_error", err && err.message ? err.message : err);
})

app.use('/', require('./routes/index'));

// Block API calls when DB is not connected (bug-catcher)
app.use('/api/v1', function (req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).send({ success: false, message: "DB_NOT_CONNECTED" });
  }
  next();
});

app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/products', require('./routes/products'))
app.use('/api/v1/categories', require('./routes/categories'))
app.use('/api/v1/roles', require('./routes/roles'))
// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // API-first: return JSON to avoid requiring missing views
  res.status(err.status || 500).send({
    success: false,
    message: err && err.message ? err.message : "ERROR",
    status: err && err.status ? err.status : 500
  });
});

module.exports = app;
