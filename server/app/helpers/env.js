"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ENVIRONMENT = {
    REDIS_PORT: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
    REDIS_HOST: process.env.REDIS_HOST || '127.0.0.1',
    NODE_ENV: 'production' === process.env.NODE_ENV || 'local' === process.env.NODE_ENV ? process.env.NODE_ENV : 'local',
    DOMAIN: process.env.REDIS_HOST || '',
    JWT_SECRET: process.env.JWT_SECRET || '',
    CF_WEB_DISTRIBUTION_DOMAIN: process.env.CF_WEB_DISTRIBUTION_DOMAIN || '',
    CF_KEY_PAIR_ID: process.env.CF_KEY_PAIR_ID || '',
    CF_PRIVATE_KEY_PATH: process.env.CF_PRIVATE_KEY_PATH || '',
};
exports.default = ENVIRONMENT;
