const express = require("express")
const app = express()
const cors = require("cors")
const http = require('http').Server(app);
const PORT = 4000

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const moment_timezone_1 = __importDefault(require("moment-timezone"));
moment_timezone_1.default.tz.setDefault('UTC');
const factories_1 = require("./app/factories");
const ioHelper_1 = __importDefault(require("./app/helpers/ioHelper"));
const helpers_1 = require("./app/helpers");
factories_1.RedisFactory.build();
const redisDataClient = factories_1.RedisFactory.getDataClient();
factories_1.ServerFactory.build(redisDataClient);
// ioHelper_1.default.initCommentsEventsNamespace();
ioHelper_1.default.initMemberAreaNamespace();
// ioHelper_1.default.initUploadsEventsNamespace();
ioHelper_1.default.initChatNamespace();
helpers_1.RedisPubSubHelper.init();

const socketIO = require('socket.io')(http, {
    cors: {
        origin: "http://localhost:3000"
    }
});

app.use(cors())
let users = []

socketIO.on('connection', (socket) => {

    console.log(`⚡: ${socket.id} user just connected!`)
    socket.on("message", data => {
        socketIO.emit("message:send", data)
    })
    /*socket.on("message", data => {
        socketIO.emit("messageResponse", data)
    })*/

    socket.on("typing", data => (
        socket.broadcast.emit("typingResponse", data)
    ))

    socket.on("newUser", data => {
        users.push(data)
        socketIO.emit("newUserResponse", users)
    })

    socket.on('disconnect', () => {
        console.log('🔥: A user disconnected');
        users = users.filter(user => user.socketID !== socket.id)
        socketIO.emit("newUserResponse", users)
        socket.disconnect()
    });
});

app.get("/api", (req, res) => {
    res.json({message: "Hello"})
});


http.listen(PORT, () => {
    console.log(`Server 1 listening on ${PORT}`);
});
