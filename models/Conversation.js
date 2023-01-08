const mongoose = require('mongoose')

const conversationSchema = new mongoose.Schema({
    members: {type: Array, default: []},
    adminId: {type: mongoose.Schema.Types.ObjectId, ref: 'users'},
    createdTime: {type: String, default: ''}
  },
  {minimize: false},
  {timestamps: true}
)

module.exports = mongoose.model('conversations', conversationSchema)
