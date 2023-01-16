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

      socket.on('typing', infoData => {
        socket.broadcast.to(infoData?.conversationId).emit('typing-event', infoData)
      })

      socket.on('no-typing', infoData => {
        socket.broadcast.to(infoData?.conversationId).emit('typing-stop', infoData)
      })

      socket.on('chat_opened', bool => {
        console.log('opened:',bool.isChatOpened)
        io.to(bool.userId).emit('isOpened', bool.isChatOpened)
      })

      socket.on('chat_closed', bool => {
        console.log('closed:',bool.isChatOpen)
        io.to(bool.userId).emit('isClosed', bool.isChatOpen)
      })
    
      socket.on('create_message', message => {
        //io.to(message?.conversationId).emit('new_message', message)
        socket.broadcast.to(message?.conversationId).emit('new_message', message)
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

    socket.on('conversation', datas => {
      socket.join(datas?._id)
console.log('user joined:', datas?._id)
      socket.on('create_conversation', convoData => {
        console.log(convoData)
        //io.to(convoData?._id).emit('new_conversation', convoData)
        socket.broadcast.to(datas?._id).emit('new_conversation', convoData)
      })

      socket.on('delete_conversation', convoData => {
        socket.broadcast.to(convoData?.otherId).emit('newDel_conversation', convoData)
      })

      socket.on('disconnect', () => {
        socket.leave(datas?._id)
        console.log('user left left left:', datas?._id)
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