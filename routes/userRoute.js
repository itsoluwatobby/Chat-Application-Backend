const { 
  handleRegister, handleLogin, handleDelete, 
  handleUpdate, handleLogout, deleteConversation, 
  getAllUsers, createConversation, getMessages, 
  getConversation, getUsersInConversation, createMessage, 
  getUserById, createGroupConversation, 
  getUsersInGroupConversation, uploadImage, getGroupConvo, 
  getGroupConversation, getUserConversation, deleteGroupConversation 
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

router.post('/register', handleRegister)
router.post('/login', handleLogin)
router.delete('/delete/:id', handleDelete)
router.put('/update/:id', handleUpdate)
router.get('/logout/:id', handleLogout)
router.get('/:userId', getUserById)
//router.post('/:userId', upload.single('photo'), uploadImage)

router.post('/create_message', createMessage)
router.get('/', getAllUsers)
router.post('/conversation/create', createConversation)
router.post('/conversation/create_group/:adminId', createGroupConversation)
router.get('/conversation/:conversationId', getConversation)
router.get('/conversation/:groupId', getGroupConversation)
router.get('/user_conversation/:userId', getUserConversation)
router.get('/group_conversation/:userId', getGroupConvo)
router.get('/usersInConversation/:userId', getUsersInConversation)
router.get('/usersInGroup/:userId', getUsersInGroupConversation)
router.delete('/conversation/delete/:conversationId/:userId/:friendId', deleteConversation)
router.delete('/group_conversation/delete/:adminId/:groupId', deleteGroupConversation)
router.get('/messages/:conversationId', getMessages)

module.exports = router