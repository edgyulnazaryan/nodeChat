"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
class UserConnections {
    /*keep socket id for auth user*/
    static addAuthUserConnection(room, userUuid, socketId, user) {
        if (!room || !userUuid || !socketId) {
            return;
        }
        if (!this.connections.auth[room]) {
            this.connections.auth[room] = {};
        }
        if (this.connections.auth[room][userUuid]) {
            this.connections.auth[room][userUuid].user = user;
            this.connections.auth[room][userUuid].connections.push(socketId);
        }
        else {
            this.connections.auth[room][userUuid] = {
                connections: [socketId],
                user: user,
                metaInfo: {
                    isOnlineSignalEmitted: false
                }
            };
        }
    }
    static getRoomUsers(room) {
        const users = [];
        if (this.connections.auth[room]) {
            Object.keys(this.connections.auth[room]).forEach((userUuid) => {
                const user = this.connections.auth[room][userUuid].user;
                users.push(user);
            });
        }
        return users;
    }
    static getAuthUser(room, userUuid) {
        if (this.connections.auth[room] && this.connections.auth[room][userUuid]) {
            return this.connections.auth[room][userUuid].user;
        }
        return null;
    }
    static updateAuthUser(room, userUuid, payload) {
        if (this.connections.auth[room] && this.connections.auth[room][userUuid]) {
            const user = this.connections.auth[room][userUuid].user;
            this.connections.auth[room][userUuid].user = {
                ...user,
                ...payload
            };
        }
    }
    /*check in meta info is online signal emmited*/
    static isAuthUserConnectionSignalEmitted(room, userUuid) {
        if (this.connections.auth[room] && this.connections.auth[room][userUuid]) {
            return this.connections.auth[room][userUuid].metaInfo.isOnlineSignalEmitted;
        }
        return false;
    }
    /*check in meta info is online signal emmited*/
    static changeAuthUserConnectionSignalStatus(room, userUuid, status) {
        if (this.connections.auth[room] && this.connections.auth[room][userUuid]) {
            this.connections.auth[room][userUuid].metaInfo.isOnlineSignalEmitted = status;
        }
    }
    /*remove socket id for auth user*/
    static removeAuthUserConnection(room, userUuid, socketId) {
        if (!room || !userUuid || !socketId) {
            return;
        }
        if (this.connections.auth[room] && this.connections.auth[room][userUuid]) {
            this.connections.auth[room][userUuid].connections = this.connections.auth[room][userUuid].connections.filter(item => {
                return item !== socketId;
            });
            if (0 === this.connections.auth[room][userUuid].connections.length) {
                delete this.connections.auth[room][userUuid];
            }
            if (lodash_1.isEmpty(this.connections.auth[room])) {
                delete this.connections.auth[room];
            }
        }
    }
    /*get all socket ids for single auth user in room */
    static getAllConnectionsForSingleAuthUserInRoom(room, userUuid) {
        return this.connections.auth[room] && this.connections.auth[room][userUuid] ? this.connections.auth[room][userUuid].connections : [];
    }
}
UserConnections.connections = {
    auth: {},
    guest: {},
};
exports.default = UserConnections;
