const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
    conversationId: {type: mongoose.Schema.Types.ObjectId, required: true, ref:'conversations'},
    senderId: {type: mongoose.Schema.Types.ObjectId, required: true, ref:'users'},
    text: {type: String, default: ''},
    isReferenced: {type: String, default: false},
    isChatRead: {type: String, default: false},
    isDeleted: {type: String, default: false},
    username: {type: String, default: ''},
    dateTime: {type: String, default: ''}
  },
  {minimize: false},
  {timestamps: true}
)

module.exports = mongoose.model('message', messageSchema)
