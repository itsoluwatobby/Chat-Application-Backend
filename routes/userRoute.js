const { 
  handleRegister, handleLogin, handleDelete, 
  handleUpdate, handleLogout, 
  deleteConversation, getAllUsers, 
  createConversation, getMessages, getConversation, 
  getUsersInConversation, createMessage, getUserById 
  } = require('../controller/userController')
const router = require('express').Router()

router.post('/register', handleRegister)
router.post('/login', handleLogin)
router.delete('/delete/:id', handleDelete)
router.put('/update/:id', handleUpdate)
router.get('/logout/:id', handleLogout)
router.get('/:id', getUserById)

router.post('/conversation/create', createConversation)
router.get('/conversation/:conversationId', getConversation)
router.get('/usersInConversation/:userId', getUsersInConversation)
router.delete('/conversation/delete/:conversationId/:userId/:friendId', deleteConversation)
router.get('/messages/:conversationId', getMessages)
router.post('/createMessage', createMessage)
router.get('/', getAllUsers)

module.exports = router