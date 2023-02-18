"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomIniterMiddleware = void 0;
const roomIniterMiddleware = (redisDataClient) => (socket, next) => {
    const { host } = socket.handshake.headers;
    const reference = socket;
    redisDataClient.get(`username:${host.split('.')[0]}`, (err, clientUuid) => {
        if (err || !clientUuid) {
            next(new Error(`Incorrect hostname: ${host}`));
        }
        else {
            reference.data = {
                room: clientUuid
            };
            next();
        }
    });
};
exports.roomIniterMiddleware = roomIniterMiddleware;
