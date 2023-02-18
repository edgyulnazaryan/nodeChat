"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = __importDefault(require("../helpers/env"));
const userGetter_1 = require("../helpers/userGetter");
const authMiddleware = (paramSocket, next) => {
    const socket = paramSocket;
    const { room } = socket.data;
    const { token } = socket.handshake.auth;
    if (token) {
        jsonwebtoken_1.default.verify(token, env_1.default.JWT_SECRET, (err, decoded) => {
            if (!err) {
                const { uuid: memberUuid, } = decoded;
                if (memberUuid) {
                    userGetter_1.UserGetter.getUserFromStorage(room, memberUuid).then((user) => {
                        if (user) {
                            console.log("BAREV")
                            socket.authInfo = {

                                isAuthenticated: true,
                                authUserUuid: user.uuid
                            };
                        }
                        else {
                            console.log("HAJOX")
                            socket.authInfo = {
                                isAuthenticated: false,
                                authUserUuid: null
                            };
                        }
                        next();
                    }).catch(() => {
                        socket.authInfo = {
                            isAuthenticated: false,
                            authUserUuid: null
                        };
                        next();
                    });
                }
                else {
                    socket.authInfo = {
                        isAuthenticated: false,
                        authUserUuid: null
                    };
                    next();
                }
            }
            else {
                socket.authInfo = {
                    isAuthenticated: false,
                    authUserUuid: null
                };
                next();
            }
        });
    }
    else {
        socket.authInfo = {
            isAuthenticated: false,
            authUserUuid: null
        };
        next();
    }
};
exports.authMiddleware = authMiddleware;
