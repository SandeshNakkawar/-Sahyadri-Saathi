const multer = require('multer')
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users')
//   },
//   filename: (req, file, cb) => {
//     //user-769357865hgi-5396875thuighi.jpeg
//     const ext = file.mimetype.split('/')[1];
//       cb(null, `user-${req.user.id}-${Date.now()}.${ext}`)
//   }
// });

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if(file.mimetype.startsWith('image')){
    cb(null, true);
  }else{
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
}


const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

exports.uploadUserPhoto = upload.single('photo');


exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  // Build a readable, collision-safe filename based on the original name
  const original = path.parse(req.file.originalname);
  const base = (original.name || 'user-photo')
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const storedFilename = `${base}-${Date.now()}.jpeg`;
  req.file.filename = storedFilename;

  const usersDir = path.join(__dirname, '..', 'public', 'img', 'users');
  await fs.promises.mkdir(usersDir, { recursive: true });

  await sharp(req.file.buffer)
    .resize(500, 500)
    .sharpen()
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(path.join(usersDir, req.file.filename));

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.updateMe = catchAsync(async (req, res, next) => {

  //console.log(req.file);
  //console.log(req.body);


  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'email');
  // Persist processed photo filename to DB
  if (req.file && req.file.filename) {
    filteredBody.photo = req.file.filename;
  }

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead'
  });
};

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);

// Do NOT update passwords with this!
exports.updateUser = factory.updateOne(User);
exports.deleteUser = factory.deleteOne(User);
