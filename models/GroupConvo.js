const mongoose = require('mongoose')

const groupConvoSchema = new mongoose.Schema({
    members: {type: Array, default: []},
    adminId: {type: mongoose.Schema.Types.ObjectId, ref: 'users'},
    groupName: {type: String, required: true},
    createdTime: {type: String, default: ''}
  },
  {minimize: false},
  {timestamps: true}
)

module.exports = mongoose.model('groupConvos', groupConvoSchema)
