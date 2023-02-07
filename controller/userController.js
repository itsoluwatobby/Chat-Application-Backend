const Users = require('../models/Users')
const Conversations = require('../models/Conversation')
const GroupConvo = require('../models/GroupConvo')
const Messages = require('../models/Messages')
const bcrypt = require('bcrypt')
const asyncHandler = require('express-async-handler');
const {format, sub} =require('date-fns');
const {cloudinary} = require('./cloudinary');

async function uploadImage(fileStr){
  //let imageFile = JSON.stringify(fileStr)
  const uploadResponse = await cloudinary.uploader.upload(fileStr, {
    upload_preset: 'dwb3ksib'
  })
  return uploadResponse?.url
}

//register users
exports.handleRegister = asyncHandler(async(req, res) => {
  const userDetails = req.body
  if(!userDetails?.email || !userDetails?.username || !userDetails?.password) return res.status(400).json('all fields required')
  
  const duplicate = await Users.findOne({email: userDetails.email}).exec()
  if(duplicate) return res.status(409).json('email already taken')
  const hashPassword = await bcrypt.hash(userDetails?.password, 10)
  await Users.create({ 
    ...userDetails, password: hashPassword
  })

  res.status(201).json({ status: true })
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

  await user.updateOne({$set: {...userDetails}})
  const loggedUser = await Users.findById(user._id).select('-password').exec()
  res.status(201).json(loggedUser)
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

    const userFriend = {...friend._doc, convoId: conversation._id, createdTime: conversation?.createdTime}
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

exports.getAllGroupConvo = asyncHandler(async(req, res) => {
  const {userId} = req.params
  const user = await Users.findById(userId).exec()
  const allGoups = await Promise.all(user?.groupIds.map(group => {
    return GroupConvo.findById(group?._id).lean()
  }))
  res.status(200).json(allGoups)
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

  // attach the time of each conversation birth
  const conversationBirth = []
  userRes.map(convo => {
    const {createdTime, ...rest} = convo
    conversationBirth.push(createdTime)
  })
  
  //attach convoId to each user
  const users = usersInConvo && usersInConvo.map((eachUser, index) => {
    return { ...eachUser, convoId: conversationIds[index], createdTime: conversationBirth[index] }
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
  const {conversationId, senderId, text, dateTime, username, referencedId, receiverId, image} = req.body

  //fetch referenced message
  const user = await Users.findById(senderId).exec()
  const referenced_message = await Messages.findById(referencedId).exec()

  await user.updateOne({$set: {lastMessage: {conversationId, text, dateTime, referencedId, receiverId}}});
  const message = await Messages.create({
    conversationId, senderId, text, dateTime, username, receiverId, image, referencedMessage: referenced_message
  })
  res.status(200).json(message);
})

//update info
exports.updateGroupInfo = asyncHandler(async(req, res) => {
  const groupDetails = req.body;
  if(!groupDetails?.groupId ) return res.status(400).json('group id required');

  const group = await GroupConvo.findById(groupDetails?.groupId).exec();
  await group.updateOne({$set: { ...groupDetails }});
  const groupRes = await GroupConvo.findById(group?._id).exec();
  res.status(201).json(groupRes);
})

//update read message info
exports.readMessage = asyncHandler(async(req, res) => {
  const { messageId } = req.params;
  if(!messageId ) return res.status(400).json('message id required');
  const targetMessage = await Messages.findById(messageId).exec();
  await targetMessage.updateOne({$set: { isMessageRead: true }});
  const messageRes = await Messages.findById(messageId).exec();
  res.status(201).json(messageRes);
})

//update delivered message info
exports.deliveredMessage = asyncHandler(async(req, res) => {
  const { messageId } = req.params;
  if(!messageId ) return res.status(400).json('message id required');
  const targetMessage = await Messages.findById(messageId).exec();
  await targetMessage.updateOne({$set: { isDelivered: true }});
  const messageRes = await Messages.findById(messageId).exec();
  res.status(201).json(messageRes);
})

function catchError(errorCode, customMessage, next, ...params){
  if(params.length){
    params.every(Boolean) ? next() : res.status(errorCode).json(customMessage);
  }
}

//add user to group conversation
exports.addUserToGroupConversation = asyncHandler(async(req, res) => {
  const { adminId } = req.params
  const { groupId, memberIds} = req.body;
  if(!groupId || !adminId || !Array.isArray(memberIds) || !memberIds?.length ) return res.status(400).json('message id required');

  //const groupMemberIds = [...memberIds, adminId]
  const targetGroup = await GroupConvo.findById(groupId).exec();
  if(!targetGroup?.adminId.equals(adminId)) return res.status(403).json('unauthorized');

  //update group
  await Promise.all(memberIds.map(eachId => {
    return targetGroup.updateOne({$push: { members: eachId }})
    }
  ))
  //update users with new groupId
  await Promise.all(memberIds.map(eachId => {
      return Users.findByIdAndUpdate({ _id: eachId }, {$push: {groupIds: targetGroup?._id}})
    }
  ))
  const updatedGroup = await GroupConvo.findById(groupId).exec();

  const groupMembers = await Promise.all(updatedGroup?.members.map(eachId => {
    return Users.findById(eachId).select('-password').exec()}
  ))
  if(!groupMembers.length) return res.status(400).json('not found')

  const users = []
  await Promise.all(groupMembers.map(member => {
    const filteredDetails = { username: member?.username, userId: member?._id, email: member?.email }
    users.push(filteredDetails)
  }))

  const newGroupMembers  = 
  { ...updatedGroup,
    members: [...users], 
    convoId: updatedGroup?._id, 
    createdAt: updatedGroup?.createdTime, 
  }
  res.status(201).json(newGroupMembers)
})

//update delete message info
exports.deleteMessage = asyncHandler(async(req, res) => {
  const { messageId, adminId, option } = req.params;
  if(!messageId || !adminId || !option) return res.status(400).json('message id required');

  const targetMessage = await Messages.findById(messageId).exec();
  //get the message creator
  const owner = await Users.findById(targetMessage?.senderId).exec();

  if(option === 'forMe'){
    if(targetMessage?.isMessageDeleted.includes(owner?._id)){
      await targetMessage.deleteOne();
      return res.sendStatus(204);
    }
    await targetMessage.updateOne({$push: { isMessageDeleted: adminId }});
    return res.status(201).json({ status: true, message: 'message deleted' });
  }
  else if(option === 'forAll' && targetMessage?.senderId.equals(adminId)){
    await targetMessage.deleteOne();
    return res.sendStatus(204);
  }
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
  const { memberIds, groupName, groupAvatar } = req.body
  if(!adminId || !Array.isArray(memberIds) || !memberIds.length) return res.status(400).json('id required')

  const groupIds = [...memberIds, adminId]

  //create group
  const dateTime = sub(new Date(), {minutes: 0}).toISOString();
  const group = await GroupConvo.create({
    members: [...memberIds, adminId], adminId, groupName, groupAvatar, createdTime: dateTime
  })
  group && await Promise.all(groupIds.map(eachId => {
      return Users.findByIdAndUpdate({ _id: eachId }, {$push: {groupIds: group?._id}})
    }
  ))

  const groupMembers = await Promise.all(groupIds.map(eachId => {
    return Users.findById(eachId).select('-password').exec()}
  ))
  if(!groupMembers.length) return res.status(403).json('not found')

  const users = []
  await Promise.all(groupMembers.map(fr => {
    const filteredDetails = { username: fr?.username, userId: fr?._id, email: fr?.email }
    users.push(filteredDetails)
  }))

  const groupUsers  = 
    { ...group,
      members: [...users], 
      convoId: group?._id, 
      createdAt: group?.createdTime, 
    }

  res.status(201).json(groupUsers)
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

  //fetch groups conversations current user is in, by the groupIds
  const groupConversations = await Promise.all(user?.groupIds.map(convoId => {
    return GroupConvo.findById(convoId).lean()
  }))
  //experiencing some null error
  const filteredGroupConversations = groupConversations.filter(userR => userR !== null)
  //const usersGroupConvos = await GroupConvo.find({userId}).lean()
  if(!filteredGroupConversations?.length) return res.status(404).json('user do not have an active group');
  //get members in each conversation 
  
  const users = []
  //const usersInEachGroup = []
  await Promise.all(filteredGroupConversations.map(async({ members }, index) => {
    const eachGroupUsers = await Promise.all(members.map(mem => {
      return Users.findById(mem).exec()
    }))
    const filteredUserDetails = eachGroupUsers.map(user => (
      { username: user?.username, userId: user?._id, email: user?.email, convoId: filteredGroupConversations[index]?._id }
    ))
    users.push(filteredUserDetails)
  }));

  let n = 0;
  const groupMembers = []

  while(n <= filteredGroupConversations.length - 1){
    const result = filteredGroupConversations.find(res => res?._id === users[n][0]?.convoId);
    const editResult = { ...result, members: [...users[n]], convoId: result?._id, createdAt: result?.createdTime}
    groupMembers.push(editResult)
    n++
  }

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