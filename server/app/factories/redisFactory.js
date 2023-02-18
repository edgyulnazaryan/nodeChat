"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const redis_1 = __importDefault(require("redis"));
const env_1 = __importDefault(require("../helpers/env"));
class RedisFactory {
    static build() {
        if (!this.wasBuilded) {
            const REDIS_PORT = env_1.default.REDIS_PORT;
            const REDIS_HOST = env_1.default.REDIS_HOST;
            this.redisDataClient = redis_1.createClient(REDIS_PORT, REDIS_HOST);
            this.redisPubSubClient = redis_1.createClient(REDIS_PORT, REDIS_HOST);
            this.wasBuilded = true;
        }
    }
    static getDataClient() {
        if (!this.wasBuilded) {
            throw new Error('Redis not builded, run build');
        }
        return this.redisDataClient;
    }
    static getPubSubClient() {
        if (!this.wasBuilded) {
            throw new Error('Redis not builded, run build');
        }
        return this.redisPubSubClient;
    }
}
exports.default = RedisFactory;
