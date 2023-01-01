const Users = require('../models/Users')
const Conversations = require('../models/Conversation')
const GroupConvo = require('../models/GroupConvo')
const Messages = require('../models/Messages')
const bcrypt = require('bcrypt')
const asyncHandler = require('express-async-handler');
const {format, sub} =require('date-fns');

exports.uploadImage = asyncHandler(async(req, res) => {
  const {id} = req.params
  if(!id) return res.status(400).json('all fields required')

  const user = await Users.findById(id).exec()
  if(!user) return res.status(403).json('bad credentials')
  const profilePicture = `http://localhost:5000/${req.file.path}`
  await user.updateOne({$set: {profilePicture}})
  res.json(user)
})
//register users
exports.handleRegister = asyncHandler(async(req, res) => {
  const userDetails = req.body
  if(!userDetails?.email || !userDetails?.username || !userDetails?.password) return res.status(400).json('all fields required')
  
  const duplicate = await Users.findOne({email: userDetails.email}).exec()
  if(duplicate) return res.status(409).json('email already taken')

  const hashPassword = await bcrypt.hash(userDetails?.password, 10)
  const user = await Users.create({...userDetails, password: hashPassword})
  res.status(201).json({status: true})
})

//log users in
exports.handleLogin = asyncHandler(async(req, res) => {
  const userDetails = req.body
  if(!userDetails?.email || !userDetails?.password) return res.status(400).json('all fields required')

  const user = await Users.findOne({email: userDetails.email}).exec()
  if(!user) return res.status(403).json('bad credentials')

  const match = await bcrypt.compare(userDetails?.password, user?.password)
  if(!match) return res.status(403).json('bad credentials')
  await user.updateOne({$set: {status: 'online', lastSeen: ''}})

  const loggedUser = await Users.findOne({email: user?.email}).select('-password').exec()
  res.status(200).json(loggedUser)
})

//delete user
exports.handleDelete = asyncHandler(async(req, res) => {
  const {id} = req.params
  if(!id) return res.status(400).json('all fields required')

  const user = await Users.findById(id).exec()
  if(!user) return res.status(403).json('bad credentials')
  await user.deleteOne()
  res.sendStatus(204)
})

//update user details
exports.handleUpdate = asyncHandler(async(req, res) => {
  const {id} = req.params
  const userDetails = req.body
  if(!id) return res.status(400).json('all fields required')

  const user = await Users.findById(id).exec()
  if(!user) return res.status(403).json('bad credentials')
  await user.updateOne({$set: {userDetails}})
  const loggedUser = await Users.findById(user._id).select('-password').exec()
  res.status(200).json(loggedUser)
})

//logout
exports.handleLogout = asyncHandler(async(req, res) => {
  const {id} = req.params
  if(!id) return res.status(400).json('id required')

  const user = await Users.findById(id).exec()
  if(!user) return res.status(403).json('bad credentials')
  const dateTime = sub(new Date(), {minutes: 0}).toISOString()
  await user.updateOne({$set: {status: 'offline', lastSeen: dateTime}})
  res.sendStatus(204)
})

//create new conversation|get conversation
exports.createConversation = asyncHandler(async(req, res) => {
  const { userId, friendId } = req.body
  if(!userId || !friendId) return res.status(400).json('id required')

  const user = await Users.findById(userId).select('-password').exec()
  if(!user) return res.status(403).json('not found')

  const friend = await Users.findById(friendId).select('-password').exec()
  if(!friend) return res.status(403).json('not found')
  
  //checking if user already exist in a conversation
  let userConversation = new Set()
  const userExist = await Conversations.find({userId}).lean()

  //if(userExist.members.map(member => member.length >= 3))
  if(userExist.length){
    const membersInConversation = await Promise.all(userExist.map(convo => convo.members))
    membersInConversation.map(singleMembers => singleMembers[1] === friendId && userConversation.add(friendId))

    if(!userConversation.has(friendId)){
      const conversation = await Conversations.create({
        members: [userId, friendId], userId
      })
      userConversation.clear()
      await user.updateOne({$push: {conversationId: conversation._id}})
      await friend.updateOne({$push: {conversationId: conversation._id}})
      const userFriend = {...friend._doc, convoId: conversation._id}
      return res.status(201).json(userFriend)
    }else{
      userConversation.clear()
      return res.status(409).json('already exist')
    }
  }else{
    const conversation = await Conversations.create({
      members: [userId, friendId], userId
    })
    await user.updateOne({$push: {conversationId: conversation._id}})
    await friend.updateOne({$push: {conversationId: conversation._id}})
console.log('this happened')
    const userFriend = {...friend._doc, convoId: conversation._id}
    res.status(201).json(userFriend)
  }
})

//delete conversation
exports.getConversation = asyncHandler(async(req, res) => {
  const {conversationId} = req.params
  const target = await Conversations.findById(conversationId)
  res.status(200).json(target)
})

exports.getUsersInConversation = asyncHandler(async(req, res) => {
  const {userId} = req.params
  if(!userId) return res.status(400).json('userId required');

  //get the target user and the userConversations ids
  const user = await Users.findById(userId).exec()
  if(!user) return res.status(403).json('user not found');

  const userConvos = await Promise.all(user?.conversationId.map(convoId => {
    return Conversations.findById(convoId).lean()
  }))
  if(!userConvos?.length) return res.status(404).json('user do not have a conversation');
  //get members in each conversation 
  const membersInConversation = await Promise.all(userConvos.map(convo => convo.members));
  //check that userID is omitted
  const friends = []
  membersInConversation.map(member => member[0] !== userId ? friends.push(member[0]) : friends.push(member[1]))
  //fetch each users and the attach the conversation id
  const usersInCovo = await Promise.all(friends.map(friendId => {
    return Users.findById(friendId).select('-password').lean()
  }))
  //conversation ids
  const conversationIds = []
  userConvos.map(convo => {
    const {_id, ...rest} = convo
    conversationIds.push(_id)
  })
  
  //attach convoId
  const users = usersInCovo.map((eachUser, index) => {
    return { ...eachUser, convoId: conversationIds[index] }
  })
  res.status(200).json(users)
})

//delete conversation
exports.deleteConversation = asyncHandler(async(req, res) => {
  const { conversationId, userId, friendId } = req.params
  if(!conversationId || !userId || !friendId) return res.status(400).json('id required')
  
  const user = await Users.findById(userId).exec()
  if(!user) return res.status(403).json('not found')

  const friend = await Users.findById(friendId).exec()
  if(!friend) return res.status(403).json('not found')

  const target = await Conversations.findById(conversationId)
  if(!target) return res.status(404).json('not found')
 
  await user.updateOne({$pull: {conversationId: target._id}})
  await friend.updateOne({$pull: {conversationId: target._id}})

  await Messages.deleteMany({conversationId: target._id})
  await target.deleteOne();
  res.sendStatus(204);
})

//getUser by id
exports.getUserById = asyncHandler(async(req, res) => {
  const {userId} = req.params
  if(!userId) return res.status(400).json('userId required')

  const user = await Users.findById(userId).select('-password').exec()
  if(!user) return res.status(403).json('user not found')
  res.status(200).json(user)
})

//get users list
exports.getAllUsers = asyncHandler(async(req, res) => {
  const users = await Users.find().select('-password').lean()
  if(!users?.length) return res.status(404).json({status: false, message: 'no users available'})
  res.status(200).json(users)  
})

//get messsages
exports.createMessage = asyncHandler(async(req, res) => {
  const {conversationId, senderId, text, dateTime} = req.body

  const message = await Messages.create({
    conversationId, senderId, text, dateTime
  })
  res.status(200).json(message);
})

//get messages
exports.getMessages = asyncHandler(async(req, res) => {
  const {conversationId} = req.params
  const messages = await Messages.find({conversationId}).lean()
  if(!messages?.length) return res.status(404).json('no messages available')
  res.status(200).json(messages)  
})

//create new group conversation
exports.createGroupConversation = asyncHandler(async(req, res) => {
  const { adminId } = req.params
  const { memberIds, groupName } = req.body
  if(!adminId || !Array.isArray(memberIds) || !memberIds.length) return res.status(400).json('id required')

  const user = await Users.findById(adminId).select('-password').exec()
  if(!user) return res.status(403).json('not found')

  const groupMembers = await Promise.all(memberIds.map(eachId => {
    return Users.findById(eachId).select('-password').exec()}
  ))
  if(!groupMembers.length) return res.status(403).json('not found')
  
  //push ids to conversation model
  const group = await GroupConvo.create({
    members: [...memberIds, adminId], userId: adminId, groupName
  })
  await user.updateOne({$push: {groupIds: group._id}});
  await Promise.all(groupMembers.map(member => member.updateOne({$push: {groupIds: group._id}})));

  const updatedDetails = await Promise.all(memberIds.map(eachId => {
    return Users.findById(eachId).select('-password').exec()}
  ))

  const userFriends = await Promise.all(updatedDetails.map(member => {
    return {...member._doc, groupId: group._id}
  }))

  res.status(201).json(userFriends)
})

//get users in a group conversation
exports.getUsersInGroupConversation = asyncHandler(async(req, res) => {
  const {userId} = req.params
  if(!userId) return res.status(400).json('userId required');

  //get the target user and the userConversations ids
  const user = await Users.findById(userId).exec()
  if(!user) return res.status(403).json('user not found');

  //get user conversations
  const usersGroupConvos = await Promise.all(user?.groupIds.map(groupId => {
    return GroupConvo.findById(groupId).lean()
  }))
  if(!usersGroupConvos?.length) return res.status(404).json('user do not have an active group');
  //get members in each conversation 
  
  const membersInGroup = await Promise.all(usersGroupConvos.map(convo => convo.members));
  //check that userID is omitted  
  const friends = []
  await membersInGroup.map(member => member.map(id => friends.push(id)))
 
  const usersInCovo = await Promise.all(friends.map(friendId => {
    return Users.findById(friendId).select('-password').lean()
  }))

  //conversation ids
  // const conversationIds = []
  // usersGroupConvos.map(convo => {
  //   const { _id } = convo
  //   conversationIds.push(_id)
  // })
  // console.log(conversationIds)
  // //attach convoId
  // const users = await usersInCovo.map((eachUser, index) => {
  //   return { ...eachUser, groupId: conversationIds }
  // })
  res.status(200).json(usersInCovo)
})

//get user friends
exports.addFriends = asyncHandler(async(req, res) => {
  
})

exports.generateMessage = (conversationId, senderId, username, text, dateTime) => {
  return {
    conversationId,
    senderId, 
    username, 
    text,
    dateTime
  }
}