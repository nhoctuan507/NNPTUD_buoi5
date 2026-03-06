var express = require('express');
var router = express.Router();

let mongoose = require('mongoose');
let User = require('../schemas/users');
let Role = require('../schemas/roles');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function sanitizeUser(userDoc) {
  if (!userDoc) return userDoc;
  let obj = typeof userDoc.toObject === 'function' ? userDoc.toObject() : userDoc;
  if (obj.password !== undefined) delete obj.password;
  if (obj.__v !== undefined) delete obj.__v;
  return obj;
}

function handleMongoError(res, error) {
  if (error && error.code === 11000) {
    return res.status(409).send({
      success: false,
      message: "DUPLICATE_KEY",
      detail: error.keyValue || {}
    });
  }
  return res.status(400).send({
    success: false,
    message: error && error.message ? error.message : "BAD_REQUEST"
  });
}

async function ensureRoleExists(roleId) {
  if (!roleId) return true;
  if (!isValidObjectId(roleId)) return false;
  let role = await Role.findOne({ _id: roleId, isDeleted: false });
  return !!role;
}

// C - Create user
// POST /api/v1/users
router.post('/', async function (req, res) {
  try {
    let roleId = req.body.role;
    if (roleId && !(await ensureRoleExists(roleId))) {
      return res.status(400).send({ success: false, message: "INVALID_ROLE" });
    }

    let newObj = new User({
      username: req.body.username,
      password: req.body.password,
      email: req.body.email,
      fullName: req.body.fullName,
      avatarUrl: req.body.avatarUrl,
      status: req.body.status,
      role: roleId,
      loginCount: req.body.loginCount
    });
    await newObj.save();
    res.status(201).send({ success: true, data: sanitizeUser(newObj) });
  } catch (error) {
    return handleMongoError(res, error);
  }
});

// R - Get all users (excluding soft deleted)
// GET /api/v1/users
router.get('/', async function (req, res) {
  try {
    let data = await User.find({ isDeleted: false })
      .populate({ path: 'role', select: 'name description' })
      .sort({ createdAt: -1 });

    res.send({ success: true, data: data.map(sanitizeUser) });
  } catch (error) {
    res.status(500).send({ success: false, message: "SERVER_ERROR" });
  }
});

// R - Get user by id
// GET /api/v1/users/:id
router.get('/:id', async function (req, res) {
  let id = req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).send({ success: false, message: "INVALID_ID" });
  }
  try {
    let result = await User.findOne({ _id: id, isDeleted: false })
      .populate({ path: 'role', select: 'name description' });
    if (!result) {
      return res.status(404).send({ success: false, message: "ID_NOT_FOUND" });
    }
    res.send({ success: true, data: sanitizeUser(result) });
  } catch (error) {
    res.status(500).send({ success: false, message: "SERVER_ERROR" });
  }
});

// U - Update user
// PUT /api/v1/users/:id
router.put('/:id', async function (req, res) {
  let id = req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).send({ success: false, message: "INVALID_ID" });
  }

  try {
    if (req.body.loginCount !== undefined) {
      let lc = Number(req.body.loginCount);
      if (Number.isNaN(lc) || lc < 0) {
        return res.status(400).send({ success: false, message: "INVALID_LOGIN_COUNT" });
      }
    }

    if (req.body.role !== undefined) {
      if (req.body.role && !(await ensureRoleExists(req.body.role))) {
        return res.status(400).send({ success: false, message: "INVALID_ROLE" });
      }
    }

    let result = await User.findOneAndUpdate(
      { _id: id, isDeleted: false },
      req.body,
      { new: true, runValidators: true }
    ).populate({ path: 'role', select: 'name description' });

    if (!result) {
      return res.status(404).send({ success: false, message: "ID_NOT_FOUND" });
    }
    res.send({ success: true, data: sanitizeUser(result) });
  } catch (error) {
    return handleMongoError(res, error);
  }
});

// D - Soft delete user
// DELETE /api/v1/users/:id
router.delete('/:id', async function (req, res) {
  let id = req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).send({ success: false, message: "INVALID_ID" });
  }
  try {
    let result = await User.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );
    if (!result) {
      return res.status(404).send({ success: false, message: "ID_NOT_FOUND" });
    }
    res.send({ success: true, data: sanitizeUser(result) });
  } catch (error) {
    res.status(500).send({ success: false, message: "SERVER_ERROR" });
  }
});

// POST /api/v1/users/enable
// body: { email, username } -> if match, set status=true
router.post('/enable', async function (req, res) {
  let email = req.body.email;
  let username = req.body.username;
  if (!email || !username) {
    return res.status(400).send({ success: false, message: "MISSING_EMAIL_OR_USERNAME" });
  }

  try {
    let result = await User.findOneAndUpdate(
      { email: String(email).toLowerCase().trim(), username: String(username).trim(), isDeleted: false },
      { status: true },
      { new: true, runValidators: true }
    ).populate({ path: 'role', select: 'name description' });

    if (!result) {
      return res.status(404).send({ success: false, message: "USER_NOT_FOUND" });
    }
    res.send({ success: true, data: sanitizeUser(result) });
  } catch (error) {
    return handleMongoError(res, error);
  }
});

// POST /api/v1/users/disable
// body: { email, username } -> if match, set status=false
router.post('/disable', async function (req, res) {
  let email = req.body.email;
  let username = req.body.username;
  if (!email || !username) {
    return res.status(400).send({ success: false, message: "MISSING_EMAIL_OR_USERNAME" });
  }

  try {
    let result = await User.findOneAndUpdate(
      { email: String(email).toLowerCase().trim(), username: String(username).trim(), isDeleted: false },
      { status: false },
      { new: true, runValidators: true }
    ).populate({ path: 'role', select: 'name description' });

    if (!result) {
      return res.status(404).send({ success: false, message: "USER_NOT_FOUND" });
    }
    res.send({ success: true, data: sanitizeUser(result) });
  } catch (error) {
    return handleMongoError(res, error);
  }
});

module.exports = router;
