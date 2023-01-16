const { Configuration, OpenAIApi } = require('openai');
const asyncHandler = require('express-async-handler');

const configuration = new Configuration({
  organization: "itsoluwatobby",
  apiKey: process.env.OPENAI_API_KEY
})

const openai = new OpenAIApi(configuration)

exports.openaiHandler = asyncHandler(async(req, res) => {
  const {userInput} = req.body

  const response = await openai.createCompletion({
    prompt: userInput,
    model: 'text-davinci-002',
    temperature: 0.5,
    max_tokens: 150
  })

  res.status(200).json(response?.data)
})