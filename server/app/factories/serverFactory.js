"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const env_1 = __importDefault(require("../helpers/env"));
class ServerFactory {
    static build(redisClient) {
        if (!this.wasBuilded) {
            this.app = express_1.default();
            this.server = new http_1.Server(this.app);
            this.io = new socket_io_1.Server(this.server, {
                pingInterval: 2000,
                pingTimeout: 4000,
                cors: {
                    origin: (origin, callback) => {
                        if (!origin) {
                            callback(new Error('Unknown origin'));
                        }
                        else {
                            origin = origin.toLowerCase();
                            if ('local' === env_1.default.NODE_ENV) {
                                callback(null, true);
                            }
                            else {
                                if (origin.includes(env_1.default.DOMAIN)) {
                                    callback(null, true);
                                }
                                else {
                                    const originToCheck = origin.replace('https://', '').replace('http://', '');
                                    redisClient.get(`customDomain:${originToCheck}`, (err, value) => {
                                        if (err || !value) {
                                            callback(new Error('Unknown origin'));
                                        }
                                        else {
                                            callback(null, true);
                                        }
                                    });
                                }
                            }
                        }
                    },
                    methods: ['POST', 'GET']
                },
                path: '/websocket'
            });
            this.wasBuilded = true;
        }
    }
    static listen(portNumber, cb) {
        if (!this.wasBuilded) {
            throw new Error('Server not builded, run buildServer');
        }
        if (!this.portIsListening && this.getExpress()) {
            this.getServer().listen(portNumber, function () {
                if (cb) {
                    cb(...arguments);
                }
            });
            this.portIsListening = true;
        }
    }
    static getExpress() {
        if (!this.wasBuilded) {
            throw new Error('Server not builded, run buildServer');
        }
        return this.app;
    }
    static getIo() {
        if (!this.wasBuilded) {
            throw new Error('Server not builded, run buildServer');
        }
        console.log('Server has been built successfully')
        return this.io;
    }
    static getServer() {
        if (!this.wasBuilded) {
            throw new Error('Server not builded, run build');
        }
        return this.server;
    }
}
exports.default = ServerFactory;
