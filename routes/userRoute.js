const { 
  handleRegister, handleLogin, handleDelete, 
  handleUpdate, handleLogout, deleteConversation, 
  getAllUsers, createConversation, getMessages, 
  getConversation, getUsersInConversation, createMessage, 
  getUserById, createGroupConversation, 
  getUsersInGroupConversation, getGroupConvo, 
  getGroupConversation, getUserConversation, deleteGroupConversation,   
  updateGroupInfo, readMessage, deliveredMessage, deleteMessage, 
  addUserToGroupConversation,
  getAllGroupConvo
  } = require('../controller/userController')
const router = require('express').Router();


{/*-------------------- AUTHENTICATION ROUTES --------------------- */}
router.post('/register', handleRegister)
router.post('/login', handleLogin)
router.get('/logout/:id', handleLogout)
//router.post('/:userId', upload.single('photo'), uploadImage)


{/*-------------------- USERS ROUTES --------------------- */}
router.put('/update/:id', handleUpdate)
router.get('/:userId', getUserById)
router.get('/', getAllUsers)
router.delete('/delete/:id', handleDelete)


{/*-------------------- CONVERSATION ROUTES --------------------- */}
router.post('/conversation/create', createConversation)
router.get('/conversation/:conversationId', getConversation)
router.get('/user_conversation/:adminId', getUserConversation)
router.get('/usersInConversation/:userId', getUsersInConversation)
router.delete('/conversation/delete/:conversationId/:adminId', deleteConversation)


{/*-------------------- GROUP CONVERSATION ROUTES --------------------- */}
router.post('/conversation/create_group/:adminId', createGroupConversation)
router.put('/conversation/update_group_info', updateGroupInfo)
router.put('/add_userToGroup/:adminId', addUserToGroupConversation)
router.get('/group_conversation/:groupId', getGroupConversation)
router.get('/user_group_conversations/:userId', getAllGroupConvo)
router.get('/target_group/:adminId', getGroupConvo)
router.get('/usersInGroup/:userId', getUsersInGroupConversation)
router.delete('/group_conversation/delete/:adminId/:groupId', deleteGroupConversation)


{/*--------------------------  MESSAGES ROUTES --------------------------- */}
router.post('/create_message', createMessage)
router.put('/message_read/:messageId', readMessage)
router.put('/message_delivered/:messageId', deliveredMessage)
router.get('/messages/:conversationId', getMessages)
router.delete('/messages_delete/:messageId/:adminId/:option', deleteMessage)

module.exports = router