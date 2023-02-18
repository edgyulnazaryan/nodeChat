"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserGetter = void 0;
const factories_1 = require("../factories");
class UserGetter {
    static getUserFromStorage(room, userUuid) {
        const redisDataClient = factories_1.RedisFactory.getDataClient();
        const key = `chatMember:${room}:${userUuid}`;
        return new Promise((resolve, reject) => {
            redisDataClient.get(key, (err, data) => {
                if (!err) {
                    if (data) {
                        try {
                            const user = JSON.parse(data);
                            resolve(user);
                        }
                        catch (err) {
                            reject(err);
                        }
                    }
                    else {
                        resolve(null);
                    }
                }
                else {
                    reject(err);
                }
            });
        });
    }
    static setUserInStorage(room, userUuid, userObject) {
        const redisDataClient = factories_1.RedisFactory.getDataClient();
        const key = `chatMember:${room}:${userUuid}`;
        return new Promise((resolve, reject) => {
            redisDataClient.set(key, JSON.stringify(userObject), (err, reply) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(reply);
                }
            });
        });
    }
}
exports.UserGetter = UserGetter;
