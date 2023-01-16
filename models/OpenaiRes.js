const mongoose = require('mongoose');

const OpenAISchema = new mongoose.Schema({
    userRequest: { 
      type: String, required: true, default: '' 
    },
    requestDate: { 
      type: String, required: true, default: '' 
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true, ref: 'users' 
    },
    requestDate: { 
      type: String, required: true, default: '' 
    },
    openAIRes: { 
      type: Object, default: {}
    }
  },
  { minimize: false },
  { timestamps: true }
)

module.exports = mongoose.model('OpenAI', OpenAISchema)

