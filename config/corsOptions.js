const allowedOrigins = [
  'https://whatsapp-desktop-clone.onrender.com', 
  'http://localhost:5173'
]

exports.corsOptions = {
  origin: (origin, callback) => {
    allowedOrigins.includes(origin) ? callback(null, true) : callback(null, new Error('NOT ALLOWED BY CORS'))
  },
  credentials: true,
  optionsSuccessStatus: 200
}