const { 
  handleRegister, handleLogin, handleDelete, 
  handleUpdate, handleLogout, 
  deleteConversation, getAllUsers, 
  createConversation, getMessages, getConversation, 
  getUsersInConversation, createMessage, getUserById, 
  createGroupConversation, getUsersInGroupConversation, 
  uploadImage, getGroupConvo 
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

const upload = multer();

router.post('/register', handleRegister)
router.post('/login', handleLogin)
router.delete('/delete/:id', handleDelete)
router.put('/update/:id', handleUpdate)
router.get('/logout/:id', handleLogout)
router.get('/:userId', getUserById)
router.post('/:userId', upload.single('photo'), uploadImage)

router.post('/conversation/create', createConversation)
router.post('/conversation/create_group/:adminId', createGroupConversation)
router.get('/conversation/:conversationId', getConversation)
router.get('/group_conversation/:groupId', getGroupConvo)
router.get('/usersInConversation/:userId', getUsersInConversation)
router.get('/usersInGroup/:userId', getUsersInGroupConversation)
router.delete('/conversation/delete/:conversationId/:userId/:friendId', deleteConversation)
router.get('/messages/:conversationId', getMessages)
router.post('/createMessage', createMessage)
router.get('/', getAllUsers)

module.exports = router