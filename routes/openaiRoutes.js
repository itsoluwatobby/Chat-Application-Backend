const express = require('express')
const router = express.Router()
const {openaiHandler} = require('../controller/openaiController')

router.post('/your_response', openaiHandler)

module.exports = router