const express = require('express')
const router = express.Router()
const {openaiHandler, getAIResponse} = require('../controller/openaiController')

router.post('/your_response', openaiHandler)
router.get('/your_responses/:userId', getAIResponse)

module.exports = router