const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    username: {type: String, required: true},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: true},
    profilePicture: {type: String, default: ''},
    status: {type: String, default: 'offline'},
    lastSeen: {type: String, default: ''},
    about: {type: String, default: ''},
    friends: {type: Array, default: []},
    conversationId: {type: Array, default: []},
    groupIds: {type: Array, default: []},
    deletedConversationIds: {type: Array, default: []},
  },
  {minimize: false},
  {timestamps: true}
)

module.exports = mongoose.model('users', userSchema)
