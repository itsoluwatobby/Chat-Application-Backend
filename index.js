require('dotenv').config()
const {dbConfig} = require('./config/dbConfig')
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

app.use(cors(corsOptions))
app.use(helmet())
app.use(express.json())
app.use(morgan('common'))
app.use(express.urlencoded({ extended: false }))
app.get('/', (req, res) => res.json('server up'))
//users route
app.use('/users', require('./routes/userRoute'))

const io = new Server(http, {
  cors:{
    origin: 'http://localhost:5173',
    methods: ['POST', 'GET']
  }
})

  io.on('connection', socket => {
    console.log('user connected')

    socket.on('start-conversation', conversationId => {
      console.log({conversationId})
      socket.join(conversationId)

      socket.on('typing', data => {
        io.to(conversationId).except(data.user).emit('typing-event', data)
      })
    
      socket.on('create-message', message => {
        io.to(conversationId).emit('newMessage', message)
      })
    
      socket.on('disconnect', () => {
        socket.leave(conversationId)
        console.log('user left')
      })
    })
  })

mongoose.connection.once('open', () => {
  console.log('Database connected')
  http.listen(PORT, () => console.log(`Server running on port ${PORT}`))
})

// mongoose.connection.on('error', (error) => {
//   console.log('Error connecting to database', error)
// })