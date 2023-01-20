const { 
  handleRegister, handleLogin, handleDelete, 
  handleUpdate, handleLogout, deleteConversation, 
  getAllUsers, createConversation, getMessages, 
  getConversation, getUsersInConversation, createMessage, 
  getUserById, createGroupConversation, 
  getUsersInGroupConversation, uploadImage, getGroupConvo, 
  getGroupConversation, getUserConversation, deleteGroupConversation,   
  updateGroupInfo, readMessage, deliveredMessage, deleteMessage
  } = require('../controller/userController')
const router = require('express').Router();
const multer = require('multer');
const path = require('path')

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, '../upload/images')
//   },
//   filename: (req, file, cb) => {
//     let ext = path.extname(file.originalname)
//     return cb(null, file.fieldname + '_' + Date.now() + ext)
//   }
// })

// {
//   storage: storage,
//   filefilter: (req, file, cb) => {
//     if(file.mimetype === 'image/jpg' || 'image/png' || 'image/jpeg'){
//       cb(null, true)
//     }else {
//       cb(null, false)
//       return
//     }
//   },
//   limits: {
//     fileSize: 1024 * 1024 * 2
//   }
// }

//const upload = multer();

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
router.get('/group_conversation/:groupId', getGroupConversation)
router.get('/group_conversation/:adminId', getGroupConvo)
router.get('/usersInGroup/:userId', getUsersInGroupConversation)
router.delete('/group_conversation/delete/:adminId/:groupId', deleteGroupConversation)


{/*--------------------------  MESSAGES ROUTES --------------------------- */}
router.post('/create_message', createMessage)
router.put('/message_read/:messageId', readMessage)
router.put('/message_delivered/:messageId', deliveredMessage)
router.get('/messages/:conversationId', getMessages)
router.get('/messages_delete', deleteMessage)

module.exports = router