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

const io = new Server(http, {
  pingTimeout: 120000,
  cors:{
    origin: 'http://localhost:5173',
    methods: ['POST', 'GET']
  }
});

  io.on('connection', socket => {

    socket.on('start-conversation', conversationId => {
      socket.join(conversationId)

      console.log('user joined conversation with id: ', conversationId)

      socket.on('typing', data => {
        socket.broadcast.to(data?.conversationId).emit('typing-event', data)
      })

      socket.on('no-typing', data => {
        socket.broadcast.to(data?.conversationId).emit('typing-stop', data)
      })

      socket.on('chat_opened', bool => {
        io.in(bool.userId).emit('isOpened', bool.isChatOpened)
      })
    
      socket.on('create_message', message => {
        io.to(message?.conversationId).emit('new_message', message)
        //socket.broadcast.to(message?.conversationId).emit('new_message', message)
      })
    
      socket.on('disconnect', () => {
        socket.leave(conversationId)
      })
    })

    socket.on('start_room_conversation', roomName => {
      socket.join(roomName)

      socket.emit('new_room', {groupName: roomName, message: `You created group ${roomName}`})
      socket.broadcast.to(roomName).emit('welcome_users', {username: 'Admin', message: `welcome to room ${roomName}`})

      socket.on('new_user', data => {
        io.to(data?.userId).emit('welcome_user', `welcome to room ${roomName}`)
        socket.broadcast.to(roomName).except([data?.userId, data?.adminId]).emit('other_users', 'New member ${data.name} joined')
      })

      socket.on('disconnect', () => {
        socket.leave(roomName)
      })
    })

    socket.on('create', create => {
      socket.join(create)

      socket.on('create_conversation', data => {
        io.to(create).emit('new_conversation', data)
      })

      socket.on('delete_conversation', data => {
        io.to(create).emit('newDel_conversation', data)
      })

      socket.on('disconnect', () => {
        socket.leave(create)
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