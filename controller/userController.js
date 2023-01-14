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
  //const profilePicture = `http://localhost:5000/${req.file.path}`
  const hashPassword = await bcrypt.hash(userDetails?.password, 10)
  const user = await Users.create({ ...userDetails, password: hashPassword })

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
  const dateTime = sub(new Date(), {minutes: 0}).toISOString();
  await user.updateOne({$set: {status: 'offline', lastSeen: dateTime}})
  res.sendStatus(204)
})

//create new conversation|get conversation
exports.createConversation = asyncHandler(async(req, res) => {
  const { adminId, friendId } = req.body
  if(!adminId || !friendId) return res.status(400).json('id required')

  const user = await Users.findById(adminId).select('-password').exec()
  if(!user) return res.status(403).json('not found')

  const friend = await Users.findById(friendId).select('-password').exec()
  if(!friend) return res.status(403).json('not found')
  
  //checking if user already exist in a conversation
  let userConversation = new Set()
  const userExist = await Conversations.find({adminId}).lean()

  //if(userExist.members.map(member => member.length >= 3))
  if(userExist.length){
    const membersInConversation = await Promise.all(userExist.map(convo => convo.members))
    membersInConversation.map(singleMembers => singleMembers[1] === friendId && userConversation.add(friendId))

    if(!userConversation.has(friendId)){
      const dateTime = sub(new Date(), {minutes: 0}).toISOString();
      const conversation = await Conversations.create({
        members: [adminId, friendId], adminId, createdTime: dateTime
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
    const dateTime = sub(new Date(), {minutes: 0}).toISOString();
    const conversation = await Conversations.create({
      members: [adminId, friendId], adminId, createdTime: dateTime
    })
    await user.updateOne({$push: {conversationId: conversation._id}})
    await friend.updateOne({$push: {conversationId: conversation._id}})

    const userFriend = {...friend._doc, convoId: conversation._id}
    res.status(201).json(userFriend)
  }
})

//get conversation
exports.getConversation = asyncHandler(async(req, res) => {
  const {conversationId} = req.params
  const target = await Conversations.findById(conversationId)
  res.status(200).json(target)
})

//get conversation
exports.getUserConversation = asyncHandler(async(req, res) => {
  const {adminId} = req.params
  const user = await Users.findById(adminId).exec();
  const target = await Promise.all(user?.conversationId.map(id => {
    return Conversations.findById(id).lean()
  }))
  const filteredTarget = target.filter(tag => tag !== null)
  const ids = []
  await filteredTarget.map(tag => ids.push(tag?.members[1]))
  res.status(200).json(ids)
})

//get group conversation
exports.getGroupConversation = asyncHandler(async(req, res) => {
  const {groupId} = req.params
  const target = await GroupConvo.findById(groupId).exec()
  res.status(200).json(target)
})

exports.getGroupConvo = asyncHandler(async(req, res) => {
  const {adminId} = req.params
  const target = await GroupConvo.find({adminId}).lean()
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

  //experiencing some null error
  const userRes = userConvos.filter(userR => userR !== null)
  if(!userConvos?.length) return res.status(404).json('user do not have a conversation');
  //get members in each conversation 
  const membersInConversation = userRes && await Promise.all(userRes.map(convo => convo?.members));
  //check that userID is omitted
  const friends = []
  membersInConversation.map(member => member[0] !== userId ? friends.push(member[0]) : friends.push(member[1]))
  //fetch each users and the attach the conversation id
  const usersInConvo = await Promise.all(friends.map(friendId => {
    return Users.findById(friendId).select('-password').lean()
  }))
  if(!usersInConvo?.length) return res.status(404).json('user do not have a conversation');
  //conversation ids
  const conversationIds = []
  userRes.map(convo => {
    const {_id, ...rest} = convo
    conversationIds.push(_id)
  })
  
  //attach convoId
  const users = usersInConvo && usersInConvo.map((eachUser, index) => {
    return { ...eachUser, convoId: conversationIds[index] }
  })
  res.status(200).json(users)
})

//delete conversation
exports.deleteConversation = asyncHandler(async(req, res) => {
  const { conversationId, adminId } = req.params
  if(!conversationId || !adminId) return res.status(400).json('id required')

  const targetGroup = await Conversations.findById(conversationId).exec()
  if(!targetGroup) return res.status(404).json('not found')
  
  if(!targetGroup?.adminId.equals(adminId)){  
    const targetUser = await Users.findById(adminId).exec();
    await targetUser.updateOne({$push: {deletedConversationIds: targetGroup?._id}})
    await targetUser.updateOne({$pull: { conversationId: targetGroup?._id }})
    //await targetGroup.updateOne({$pull: {members: adminId}})
    return res.status(200).json({status: true, message: 'you deleted the conversation'})
  }
  else{
    const filterIds = targetGroup?.members.filter(id => id !== null)
    const everyMember = filterIds && await Promise.all(filterIds.map(eachId => Users.findById(eachId)))
    const filteredMembers = everyMember && everyMember.filter(user => user !== null)
    filteredMembers && await Promise.all(filteredMembers.map(eachUser => {
      return eachUser.updateOne({$pull: { conversationId: targetGroup?._id, deletedConversationIds: targetGroup?._id  }})
    }))
    await Messages.deleteMany({conversationId: targetGroup?._id})
    await targetGroup.deleteOne();
    res.sendStatus(204);
  }
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

//create messsages
exports.createMessage = asyncHandler(async(req, res) => {
  const {conversationId, senderId, text, dateTime, username, referencedId, receiverId} = req.body

  //fetch referenced message
  const referenced_message = await Messages.findById(referencedId).exec()

  const message = await Messages.create({
    conversationId, senderId, text, dateTime, username, receiverId, referencedMessage: referenced_message
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
function modelHelper(){

}
//create new group conversation
exports.createGroupConversation = asyncHandler(async(req, res) => {
  const { adminId } = req.params
  const { memberIds, groupName } = req.body
  if(!adminId || !Array.isArray(memberIds) || !memberIds.length) return res.status(400).json('id required')

  const groupIds = [...memberIds, adminId]
  const groupMembers = await Promise.all(groupIds.map(eachId => {
    return Users.findById(eachId).select('-password').exec()}
  ))
  if(!groupMembers.length) return res.status(403).json('not found')

  const users = []
  await Promise.all(groupMembers.map(fr => {
    const filteredDetails = { username: fr?.username, userId: fr?._id, email: fr?.email }
    users.push(filteredDetails)
  }))

  //create group
  const dateTime = sub(new Date(), {minutes: 0}).toISOString();
  const group = users.length && await GroupConvo.create({
    members: [...memberIds, adminId], adminId, groupName, createdTime: dateTime
  })
  group && await Promise.all(groupIds.map(eachId => Users.findByIdAndUpdate({ _id: eachId }, {$push: {groupIds: group?._id}})))

  const groupUsers  = { members: [...users], groupName: group?.groupName, convoId: group?._id, createdAt: group?.createdTime }
  res.status(201).json(groupUsers)
})

//update info
exports.updateGroupInfo = asyncHandler(async(req, res) => {
  const { groupName, groupDescription, groupId } = req.body;
  if(!groupId ) return res.status(400).json('group id required');
  const group = await GroupConvo.findById(groupId).exec();
  await group.updateOne({$set: { groupName, description: groupDescription }});
  const groupRes = await GroupConvo.findById(groupId).exec();
  res.status(201).json(groupRes);
})

//delete group conversation
exports.deleteGroupConversation = asyncHandler(async(req, res) => {
  const { adminId, groupId } = req.params
  if(!adminId ) return res.status(400).json('id required')

  const targetGroup = await GroupConvo.findById(groupId).exec()
  if(!targetGroup) return res.status(403).json('not found')

  if(!targetGroup?.adminId.equals(adminId)){
    const user = await Users.findById(adminId).exec()
    await user.updateOne({ $push: { deletedConversationIds: groupId } }) 
    await user.updateOne({ $pull: { groupIds: targetGroup?._id } })
    await targetGroup.updateOne({$pull: { members: adminId }})        
    return res.status(200).json({ status: true, message: 'you left the group successfully' })
  }
  else{
    const filterIds = targetGroup?.members.filter(id => id !== null)
    const everyMember = filterIds && await Promise.all(filterIds.map(eachId => Users.findById(eachId)))
    const filteredMembers = everyMember && everyMember.filter(user => user !== null)
    filteredMembers && await Promise.all(filteredMembers.map(eachUser => {
      return eachUser.updateOne({$pull: { groupIds: targetGroup?._id, deletedConversationIds: targetGroup?._id  }})
    }))
    await Messages.deleteMany({ conversationId: targetGroup?._id })
    await targetGroup.deleteOne();  
    res.sendStatus(204);
  }
})

//get users in a group conversation
exports.getUsersInGroupConversation = asyncHandler(async(req, res) => {
  const {userId} = req.params
  if(!userId) return res.status(400).json('userId required');

  const user = await Users.findById(userId).exec()
  if(!user) return res.status(403).json('user not found');

  const usersGroupConvos = await Promise.all(user?.groupIds.map(convoId => {
    return GroupConvo.findById(convoId).lean()
  }))
  //experiencing some null error
  const userResGroup = usersGroupConvos.filter(userR => userR !== null)
  //const usersGroupConvos = await GroupConvo.find({userId}).lean()
  if(!userResGroup?.length) return res.status(404).json('user do not have an active group');
  //get members in each conversation 
  const friends = []
  await Promise.all(userResGroup.map(async({ members }) => {
    const userMem = await Promise.all(members.map(mem => {
      return Users.findById(mem).exec()
    }))
    friends.push(userMem)
  }));

  const users = []
  await Promise.all(friends.map((friend, i) => {
    var filteredDetails = friend.map(fr => (
      { username: fr?.username, userId: fr?._id, email: fr?.email, convoId: userResGroup[i]?._id }
    ))
    users.push(filteredDetails)
  }))

  const groupMembers  = users.map((n, i) => (
    { members: [...users[i]], groupName: userResGroup[i]?.groupName, convoId: userResGroup[i]?._id, createdAt: userResGroup[i]?.createdTime }
  ))

  res.status(200).json(groupMembers)
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