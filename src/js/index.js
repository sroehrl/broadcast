const express = require('express');
const app = express();
const cors = require('cors')
const http = require('http');
const authorization = require('./auth')


app.use(cors())
app.use(express.json())
const server = http.createServer(app);
const { Server } = require("socket.io");
const {config} = require("dotenv");
config({path: process.env.ENV_PATH})
const io = new Server(server, {
    cors: {
        origin: "*"
    }
});


const namespaces = [];

app.get('/', (req, res) => {
    res.send('Socket server running...')
});

app.use(require('./phpRoutes')(io))

// entity list
io.of(/^\/entity\/[a-z0-9]+$/i).on("connection", authorization.blockUnauthorizedSocketConnections)
// single entity
io.of(/^\/entity\/[a-z0-9]+\/\d+/i).on("connection", authorization.blockUnauthorizedSocketConnections)

io.on('connection', (socket) => {
    console.log('a user connected');
});

io.on("new_namespace", ns => {
    namespaces.push(ns.name)
})


server.listen(process.env.SOCKET_SERVER_PORT, () => {
    console.log('listening on *:' + process.env.SOCKET_SERVER_PORT);
});