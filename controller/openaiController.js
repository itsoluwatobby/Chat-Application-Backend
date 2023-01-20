const { Configuration, OpenAIApi } = require('openai');
const asyncHandler = require('express-async-handler');
const AIModel = require('../models/OpenaiRes');
const {sub} = require('date-fns');

const configuration = new Configuration({
  organization: "itsoluwatobby",
  apiKey: process.env.OPENAI_API_KEY
})

const openai = new OpenAIApi(configuration)

exports.openaiHandler = asyncHandler(async(req, res) => {
  const { userInput, userId } = req.body

  const dateTime = sub(new Date(), { minutes: 0 }).toISOString()
  const {data} = await openai.createCompletion({
    prompt: userInput,
    model: 'text-davinci-002',
    temperature: 0.5,
    max_tokens: 150
  })

  const aiRes = { id: data?.id, text: data?.choices[0]?.text }
  const result = await AIModel.create({
    userRequest: userInput, requestDate: dateTime, userId, openAIRes: aiRes
  })
  res.status(201).json(result)
})

exports.getAIResponse = asyncHandler(async(req, res) => {
  const { userId } = req.params
  if(!userId) return res.status(40).json('userId required')

  const result = await AIModel.find({userId}).lean()
  if(!result) return res.status(403).json('no response found')
  res.status(200).json(result)
})

exports.clearConversation = asyncHandler(async(req, res) => {
  const { userId } = req.params
  if(!userId) return res.status(40).json('userId required')
  await AIModel.deleteMany({userId})
  res.sendStatus(204)
})