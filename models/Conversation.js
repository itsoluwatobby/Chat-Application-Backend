const mongoose = require('mongoose')

const conversationSchema = new mongoose.Schema({
    members: {type: Array, default: []},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: 'users'}
  },
  {minimize: false},
  {timestamps: true}
)

module.exports = mongoose.model('conversations', conversationSchema)
