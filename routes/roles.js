var express = require('express');
var router = express.Router();
let mongoose = require('mongoose');
let Role = require('../schemas/roles');

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function handleMongoError(res, error) {
  // Duplicate key (unique) error
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

// C - Create role
// POST /api/v1/roles
router.post('/', async function (req, res) {
  try {
    let newObj = new Role({
      name: req.body.name,
      description: req.body.description
    });
    await newObj.save();
    res.status(201).send({ success: true, data: newObj });
  } catch (error) {
    return handleMongoError(res, error);
  }
});

// R - get all roles (excluding soft deleted)
// GET /api/v1/roles
router.get('/', async function (req, res) {
  try {
    let data = await Role.find({ isDeleted: false }).sort({ createdAt: -1 });
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({ success: false, message: "SERVER_ERROR" });
  }
});

// R - get role by id
// GET /api/v1/roles/:id
router.get('/:id', async function (req, res) {
  let id = req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).send({ success: false, message: "INVALID_ID" });
  }
  try {
    let result = await Role.findOne({ _id: id, isDeleted: false });
    if (!result) {
      return res.status(404).send({ success: false, message: "ID_NOT_FOUND" });
    }
    res.send({ success: true, data: result });
  } catch (error) {
    res.status(500).send({ success: false, message: "SERVER_ERROR" });
  }
});

// U - update role
// PUT /api/v1/roles/:id
router.put('/:id', async function (req, res) {
  let id = req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).send({ success: false, message: "INVALID_ID" });
  }
  try {
    let result = await Role.findOneAndUpdate(
      { _id: id, isDeleted: false },
      req.body,
      { new: true, runValidators: true }
    );
    if (!result) {
      return res.status(404).send({ success: false, message: "ID_NOT_FOUND" });
    }
    res.send({ success: true, data: result });
  } catch (error) {
    return handleMongoError(res, error);
  }
});

// D - soft delete role
// DELETE /api/v1/roles/:id
router.delete('/:id', async function (req, res) {
  let id = req.params.id;
  if (!isValidObjectId(id)) {
    return res.status(400).send({ success: false, message: "INVALID_ID" });
  }
  try {
    let result = await Role.findOneAndUpdate(
      { _id: id, isDeleted: false },
      { isDeleted: true },
      { new: true }
    );
    if (!result) {
      return res.status(404).send({ success: false, message: "ID_NOT_FOUND" });
    }
    res.send({ success: true, data: result });
  } catch (error) {
    res.status(500).send({ success: false, message: "SERVER_ERROR" });
  }
});

module.exports = router;

