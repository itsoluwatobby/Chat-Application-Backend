const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
    conversationId: {type: mongoose.Schema.Types.ObjectId, required: true, ref:'conversations'},
    senderId: {type: mongoose.Schema.Types.ObjectId, required: true, ref:'users'},
    text: {type: String, default: ''},
    referencedMessage: {type: Object, default: {}},
    isDelivered: {type: String, default: false},
    isMessageRead: {type: String, default: false},
    isMessageDeleted: {type: Array, default: []},
    username: {type: String, default: ''},
    dateTime: {type: String, default: ''}
  },
  {minimize: false},
  {timestamps: true}
)

module.exports = mongoose.model('message', messageSchema)
