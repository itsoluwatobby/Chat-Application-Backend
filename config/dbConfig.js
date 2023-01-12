const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');

exports.dbConfig = asyncHandler(async() => {
  await mongoose.connect(process.env.MONGO_URI, {
    useUnifiedTopology: true, useNewUrlParser: true
  })
  //mongoose.set('strictQuery', true)
})
