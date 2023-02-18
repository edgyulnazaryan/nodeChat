"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const factories_1 = require("../factories");
const constants_1 = require("../constants");
const middlewares_1 = require("../middlewares");
const utils_1 = __importDefault(require("./utils"));
const userGetter_1 = require("./userGetter");
const userConnections_1 = __importDefault(require("./userConnections"));
const chatEventBinder_1 = __importDefault(require("../helpers/chatEventBinder"));
class IoHelper {
    static initCommentsEventsNamespace() {
        const io = factories_1.ServerFactory.getIo();
        const redisDataClient = factories_1.RedisFactory.getDataClient();
        io.of(constants_1.COMMENTS_EVENTS_NAMESPACE)
            .use(middlewares_1.roomIniterMiddleware(redisDataClient))
            .on('connection', (socket) => {
            const { room } = socket.data;
            socket.join(room);
        });
    }
    static initMemberAreaNamespace() {
        const io = factories_1.ServerFactory.getIo();
        const redisDataClient = factories_1.RedisFactory.getDataClient();
        try {
            console.log(11222222222222222)
            io.of('/chat')
                // .use(middlewares_1.roomIniterMiddleware(redisDataClient))
                .on('connection', (socket) => {
                    console.log(2222, socket.data)
                    const { room } = socket.data;
                    socket.join(room);
                });
            /*io.of(constants_1.MEMBER_AREA_NAMESPACE)
                // .use(middlewares_1.roomIniterMiddleware(redisDataClient))
                .on('connection', (socket) => {
                    console.log(2222, socket.data)
                    const { room } = socket.data;
                    socket.join(room);
                });*/
        } catch (e) {
            console.log(123123123123, e)
        }
    }
    static initUploadsEventsNamespace() {
        const io = factories_1.ServerFactory.getIo();
        const redisDataClient = factories_1.RedisFactory.getDataClient();
        io.of(constants_1.UPLOADS_EVENTS_NAMESPACE)
            .use(middlewares_1.roomIniterMiddleware(redisDataClient))
            .on('connection', (socket) => {
            const { room } = socket.data;
            socket.join(room);
        });
    }
    static initChatNamespace() {
        const io = factories_1.ServerFactory.getIo();
        const redisDataClient = factories_1.RedisFactory.getDataClient();
        io.of(constants_1.CHAT_NAMESPACE)
            // .use(middlewares_1.roomIniterMiddleware(redisDataClient))
            .use(middlewares_1.authMiddleware)
            .on('connection', (socket) => {
            const { room } = socket.data;
                console.log(123, isAuthenticated, authUserUuid)
            const { id: socketId, authInfo:
                {
                    isAuthenticated,
                    authUserUuid
                }
            } = socket;

            if (!isAuthenticated) {
                console.log("NOT Authenticated")
                return;
            }
                console.log("Authenticated !!! ")

            const publicRoomName = `authRoom:${room}`;
            const authCientRoomName = `authRoom:${room}:user:${authUserUuid}`;
            socket.on('online', async () => {

                const authUser = await userGetter_1.UserGetter.getUserFromStorage(room, authUserUuid);
                socket.join(publicRoomName);
                socket.join(authCientRoomName);
                userConnections_1.default.addAuthUserConnection(room, authUserUuid, socketId, authUser);
                chatEventBinder_1.default(socket, () => {
                    const authUsers = userConnections_1.default.getRoomUsers(room);
                    const usersToEmit = authUsers.map(user => utils_1.default.transformUserForEmit(user));
                    socket.emit('users:online', usersToEmit); // sending to the client
                    if (!userConnections_1.default.isAuthUserConnectionSignalEmitted(room, authUserUuid)) {
                        // emit online signal to room for new user.
                        // Perform check to ensure that signal not emitting several time if same user open chat with differrent devices
                        userConnections_1.default.changeAuthUserConnectionSignalStatus(room, authUserUuid, true);
                        socket.to(publicRoomName).emit('user:online', utils_1.default.transformUserForEmit(authUser)); // sending to all clients in "public" room except sender
                    }
                    socket.emit('ready'); // sending to the client
                });
            });
            socket.on('disconnect', () => {
                const authUser = userConnections_1.default.getAuthUser(room, authUserUuid);
                userConnections_1.default.removeAuthUserConnection(room, authUserUuid, socketId);
                if (0 === userConnections_1.default.getAllConnectionsForSingleAuthUserInRoom(room, authUserUuid).length) {
                    const userKey = `${room}:${authUserUuid}`;
                    if (IoHelper.userOfflineTimeouts[userKey]) {
                        clearTimeout(IoHelper.userOfflineTimeouts[userKey]);
                        delete IoHelper.userOfflineTimeouts[userKey];
                    }
                    const timeoutId = setTimeout(() => {
                        if (0 === userConnections_1.default.getAllConnectionsForSingleAuthUserInRoom(room, authUserUuid).length) {
                            socket.to(publicRoomName).emit('user:offline', utils_1.default.transformUserForEmit(authUser)); // sending to all clients in "public" room except sender
                        }
                        delete IoHelper.userOfflineTimeouts[userKey];
                    }, 60000);
                    IoHelper.userOfflineTimeouts[userKey] = timeoutId;
                }
            });
        });
    }
}
IoHelper.userOfflineTimeouts = {};
exports.default = IoHelper;
