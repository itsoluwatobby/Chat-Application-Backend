const express = require('express')
const router = express.Router()
const {openaiHandler, getAIResponse, clearConversation} = require('../controller/openaiController')

router.post('/your_response', openaiHandler)
router.get('/your_responses/:userId', getAIResponse)
router.delete('/clear_conversation/:userId', clearConversation)

module.exports = router