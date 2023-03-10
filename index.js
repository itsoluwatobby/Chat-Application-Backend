require('dotenv').config()

const { dbConfig } = require('./config/dbConfig')
const express = require('express')
const app = express()

const http = require('http').createServer(app)
const PORT = process.env.PORT || 5000

const {corsOptions} = require('./config/corsOptions')
const mongoose = require('mongoose')
const cors = require('cors')

const {Server} = require('socket.io')
const helmet = require('helmet')
const morgan = require('morgan')

dbConfig()

//mongoose.set('strictQuery', false)
app.use(cors(corsOptions));
app.use(helmet());
app.use(express.json());
app.use(express.static('upload/images'));
app.use(morgan('common'));
app.use(express.urlencoded({ extended: false }));
app.get('/', (req, res) => res.json('server up'));

//users route
app.use('/users', require('./routes/userRoute'));
app.use('/openai', require('./routes/openaiRoutes'));

let URL_CONNECT = 'https://whatsapp-desktop-clone.onrender.com'
let LOCAL_HOST = 'http://localhost:5173'

const io = new Server(http, {
  pingTimeout: 120000,
  cors:{
    origin: URL_CONNECT,
    methods: ['POST', 'GET']
  }
});

  io.on('connection', socket => {

    socket.on('start-conversation', conversationId => {

      conversationId && socket.join(conversationId)

      socket.on('typing', infoData => {
        conversationId && socket.broadcast.to(infoData?.conversationId).emit('typing-event', infoData)
      })

      socket.on('no-typing', infoData => {
        conversationId && socket.broadcast.to(infoData?.conversationId).emit('typing-stop', infoData)
      })

      socket.on('chat_opened', bool => {
        conversationId && io.to(bool.userId).emit('isOpened', bool.isChatOpened)
      })

      socket.on('chat_closed', bool => {
        conversationId && io.to(bool.userId).emit('isClosed', bool.isChatOpen)
      })
    
      socket.on('create_message', message => {
        conversationId && socket.broadcast.to(message?.conversationId).emit('new_message', message)
      })

      socket.on('reload_message', message => {
        conversationId && socket.broadcast.to(message?.conversationId).emit('message_reload', message)
      })
    
      socket.on('disconnect', () => {
        socket.leave(conversationId)
      })
    })

    socket.on('start_room_conversation', roomName => {

      roomName && socket.join(roomName)

      roomName && socket.emit('new_room', {groupName: roomName, message: `You created group ${roomName}`})
      roomName && socket.broadcast.to(roomName).emit('welcome_users', {username: 'Admin', message: `welcome to room ${roomName}`})

      socket.on('new_user', data => {
        roomName && io.to(data?.userId).emit('welcome_user', `welcome to room ${roomName}`)
        roomName && socket.broadcast.to(roomName).except([data?.userId, data?.adminId]).emit('other_users', 'New member ${data.name} joined')
      })

      socket.on('disconnect', () => {
        socket.leave(roomName)
      })
    })
let count = 0
    socket.on('conversation', chatApp => {

      chatApp && socket.join(chatApp)
      socket.on('create_conversation', convoData => {
        chatApp && socket.broadcast.to(chatApp).emit('new_conversation', convoData?.conversation)
      })

      socket.on('delete_conversation', convoData => {
        chatApp && socket.broadcast.to(convoData?.room).emit('newDel_conversation', convoData?.convo)
      })

      socket.on('disconnect', () => {
        socket.leave(chatApp)
      })
    })

  })
    
  mongoose.connection.once('open', () => {
    console.log('Database connected')
    http.listen(PORT, () => console.log(`Server running on port ${PORT}`))
    console.log(http.listening)
  })

  mongoose.connection.on('error', (error) => {
    console.log('Error connecting to database', error.message)
  })