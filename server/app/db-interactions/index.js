"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });

exports.increaseUserFreeMessageLimitCount =
exports.incrementUserUsedFreeMessageLimitCount =
exports.setUserPurchasedSingleMessageCount =
exports.getChatSettings =
exports.getConversation =
exports.updateMessage =
exports.createResourcesMessage =
exports.createTextMessage =
exports.deleteMessage =
exports.toggleMessageLike =
exports.createConnection =
void 0;

const mysql_1 = __importDefault(require("mysql"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const factories_1 = require("../factories");
/* helper functions start */
const _getChatSettingsFromMysqlPromisified = (room) => {
    return new Promise((resolve, reject) => {
        let connection = createConnection(room);
        connection.connect();
        const chatSettingKeys = [
            "'chat_group_is_active'",
            "'chat_private_active_members_messaging_mode'",
            "'chat_private_active_members_payed_messaging_payload'",
            "'chat_private_expired_members_messaging_mode'",
            "'chat_private_expired_members_payed_messaging_payload'",
            "'chat_private_guest_members_messaging_mode'",
            "'chat_private_guest_members_payed_messaging_payload'",
        ];
        const query = `select \`key\`, \`value\` from \`settings\` where \`key\`
            in (${chatSettingKeys.join(',')})`;


        connection.query(query, (err, result) => {
            connection.end();
            try {
                if (err || 0 === result.length) {
                    reject(err);
                }
                else {
                    const finalResult = {};
                    result.forEach((value) => {
                        finalResult[value.key] = value.value;
                    });
                    finalResult['chat_group_is_active'] = Boolean(Number(finalResult['chat_group_is_active']));
                    finalResult['chat_group_show_list_and_count_of_all_online_members'] = Boolean(Number(finalResult['chat_group_show_list_and_count_of_all_online_members']));
                    finalResult['chat_private_active_members_payed_messaging_payload'] = JSON.parse(finalResult['chat_private_active_members_payed_messaging_payload']);
                    finalResult['chat_private_expired_members_payed_messaging_payload'] = JSON.parse(finalResult['chat_private_expired_members_payed_messaging_payload']);
                    finalResult['chat_private_guest_members_payed_messaging_payload'] = JSON.parse(finalResult['chat_private_guest_members_payed_messaging_payload']);
                    resolve(finalResult);
                }
            }
            catch (e) {
                reject(e);
            }
        });
    });
};
const _getFromRedis = (key) => {
    const redisDataClient = factories_1.RedisFactory.getDataClient();
    return new Promise((resolve, reject) => {
        redisDataClient.get(key, (err, reply) => {
            if (err) {
                reject(err);
            }
            else {
                if (null === reply) {
                    resolve(null);
                }
                else {
                    resolve(JSON.parse(reply));
                }
            }
        });
    });
};
const _setInRedis = (key, info) => {
    const redisDataClient = factories_1.RedisFactory.getDataClient();
    return new Promise((resolve, reject) => {
        redisDataClient.set(key, JSON.stringify(info), 'EX', 86400, (err, reply) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(reply);
            }
        });
    });
};
const _getConversationInfoFromMysqlPromisified = (room, conversationId) => {
    return new Promise((resolve, reject) => {
        let connection = createConnection(room);
        connection.connect();
        const query = `select type from chat_rooms where id=${connection.escape(conversationId)}`;
        connection.query(query, (err, result) => {
            if (err || 0 === result.length) {
                reject(err);
                connection.end();
            }
            else {
                const { type } = result[0];
                if ('public' === type) {
                    resolve({
                        type: 'public',
                    });
                    connection.end();
                }
                else {
                    const query = `select member_uuid from chat_room_participants where chat_room_id=${connection.escape(conversationId)}`;
                    connection.query(query, (err, result) => {
                        if (err || 0 === result.length) {
                            reject();
                            connection.end();
                        }
                        else {
                            const userUuids = [];
                            result.forEach((item) => {
                                userUuids.push(item.member_uuid);
                            });
                            resolve({
                                type: 'private',
                                userUuids
                            });
                            connection.end();
                        }
                    });
                }
            }
        });
    });
};
/* helper functions end */
const createConnection = (room) => {
    return mysql_1.default.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: `miestro_${room}`,
        charset: 'utf8mb4'
    });
};
exports.createConnection = createConnection;
/*const toggleMessageLike = (room, messageId, userUuid, isLiked) => {
    let connection = createConnection(room);
    connection.connect();
    let query = null;
    if (isLiked) {
        query = `INSERT IGNORE INTO \`chat_message_likes\` (\`id\`, \`member_uuid\`, \`chat_message_id\`, \`created_at\`, \`updated_at\`) VALUES (NULL, ${connection.escape(userUuid)}, ${connection.escape(messageId)}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);`;
    }
    else {
        query = `DELETE FROM \`chat_message_likes\` WHERE \`chat_message_id\`=${connection.escape(messageId)} AND \`member_uuid\`=${connection.escape(userUuid)};`;
    }
    connection.query(query, (err) => {
        connection.end();
    });
};*/
/*exports.toggleMessageLike = toggleMessageLike;*/
const deleteMessage = (room, messageId, userUuid, conversationId, isAdmin) => {
    let connection = createConnection(room);
    connection.connect();
    let query = `DELETE FROM \`chat_messages\` WHERE \`id\`=${connection.escape(messageId)} AND \`chat_room_id\`=${connection.escape(conversationId)}`;
    if (!isAdmin) {
        query += ` AND \`member_uuid\`=${connection.escape(userUuid)}`;
    }
    connection.query(query, () => {
        connection.end();
    });
};
exports.deleteMessage = deleteMessage;
const updateMessage = (room, messageId, text, userUuid, conversationId) => {
    let ford = createConnection(room);
    ford.connect();
    let query = `UPDATE \`chat_messages\` SET \`text\`=${ford.escape(text)}, \`edited\`=1  WHERE \`id\`=${ford.escape(messageId)} AND \`chat_room_id\`=${ford.escape(conversationId)} AND \`member_uuid\`=${ford.escape(userUuid)};`;
    ford.query(query, () => {
        ford.end();
    });
};
exports.updateMessage = updateMessage;
const getChatSettings = (room) => {
    /*
        Chat settings payload example
        {
            "chat_group_is_active": true,
            "chat_group_show_list_and_count_of_all_online_members": true,
            "chat_private_active_members_messaging_mode": "payed",
            "chat_private_active_members_payed_messaging_payload": {
                "price_for_text_message": 0.05,
                "free_text_messages_rules": {
                    "mode": "for_new_members",
                    "number_of_free_messages": 25
                }
            },
            "chat_private_expired_members_messaging_mode": "off",
            "chat_private_expired_members_payed_messaging_payload": {
                "price_for_text_message": 0.06
            },
            "chat_private_guest_members_messaging_mode": "off",
            "chat_private_guest_members_payed_messaging_payload": {
                "price_for_text_message": 1.5,
                "free_text_messages_rules": {
                    "number_of_free_messages": 25
                }
            }
        }
    */
    return new Promise(async (resolve, reject) => {
        try {
            const redisKeyForChatSettings = `v2ChatCache:${room}:chatSettings`;
            let chatSettings = await _getFromRedis(redisKeyForChatSettings);
            if (!chatSettings) {
                chatSettings = await _getChatSettingsFromMysqlPromisified(room);
                await _setInRedis(redisKeyForChatSettings, chatSettings);
            }
            resolve(chatSettings);
        }
        catch (e) {
            reject(e);
        }
    });
};
exports.getChatSettings = getChatSettings;
const getConversation = async (room, conversationId) => {
    /*
        Conversation payload for public type
        {
            type: 'public'
        }
        Conversation payload for private type (include array of users of conversation)
        {
            type: 'private',
            [
                'user-uuid-1',
                'user-uuid-2'
            ]
        }
    */
    return new Promise(async (resolve, reject) => {
        try {
            let conversation;
            const redisKeyForConversaion = `v2ChatCache:${room}:conversationInfo:${conversationId}`;
            conversation = await _getFromRedis(redisKeyForConversaion);
            if (!conversation) {
                conversation = await _getConversationInfoFromMysqlPromisified(room, conversationId);
                await _setInRedis(redisKeyForConversaion, conversation);
            }
            resolve(conversation);
        }
        catch (e) {
            reject(e);
        }
    });
};
exports.getConversation = getConversation;
const createMessageResources = (room, messageId, resources, type, duration, coverImage) => {
    const insertPhoto = (room, messageId, pathPath) => {
        return new Promise((resolve, reject) => {
            let connection = createConnection(room);
            connection.connect();
            const tableName = 'photo_unlock' === type ? 'chat_message_photos' : 'chat_message_videos';
            let columnName = '';
            let columnValue = '';
            if ('video_unlock' === type) {
                columnName = ' \`duration\`, \`cover_path\`,';
                columnValue = ` ${connection.escape(duration)}, ${connection.escape(coverImage)},`;
            }
            let query = `INSERT INTO \`${tableName}\` (\`id\`, \`chat_message_id\`, \`path\`,${columnName} \`created_at\`, \`updated_at\`)
                VALUES (NULL, ${connection.escape(messageId)}, ${connection.escape(pathPath)},${columnValue} CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6));`;
            connection.query(query, (err, okPacket) => {
                if (!err) {
                    connection.end();
                    const { insertId } = okPacket;
                    resolve(insertId);
                }
                else {
                    reject(err);
                    connection.end();
                }
            });
        });
    };
    return new Promise(async (resolve, reject) => {
        for (const path of resources) {
            try {
                await insertPhoto(room, messageId, path);
            }
            catch (error) {
                reject(error);
            }
        }
        resolve();
    });
};
const createResourcesMessage = (room, text, sentAt, userUuid, conversationId, parentId, resources, unlockPrice, type, duration, coverImage, blurhash, lockedPosterIsBlur, isUnlocked, resourceId, resourceType) => {
    let unlockDetails = {};
    if ('video_unlock' === type) {
        unlockDetails = {
            is_unlocked: !!isUnlocked,
            unlock_price: unlockPrice,
            video_duration: duration,
            cover: coverImage,
            src: resources[0],
            locked_poster_is_blur: lockedPosterIsBlur,
            resource_id: resourceId,
            resource_type: resourceType,
        };
    }
    else if ('photo_unlock' === type) {
        unlockDetails = {
            is_unlocked: !!isUnlocked,
            unlock_price: unlockPrice,
            photos_count: resources.length,
            cover: resources[0],
            photos_blurhash: blurhash,
            locked_poster_is_blur: lockedPosterIsBlur,
            resource_id: resourceId,
            resource_type: resourceType,
        };
    }
    return new Promise(async (resolve, reject) => {
        try {
            const messageId = await createMessage(room, text, sentAt, userUuid, conversationId, parentId, type, JSON.stringify(unlockDetails));
            await createMessageResources(room, messageId, resources, type, duration, coverImage);
            resolve(messageId);
        }
        catch (error) {
            reject(error);
        }
    });
};
exports.createResourcesMessage = createResourcesMessage;
const createTextMessage = (room, text, sentAt, userUuid, conversationId, parentId) => {
    return createMessage(room, text, sentAt, userUuid, conversationId, parentId, 'text_message', null);
};
exports.createTextMessage = createTextMessage;
const createMessage = (room, text, sentAt, userUuid, conversationId, parentId, messageType, unlockDetails) => {
    return new Promise((resolve, reject) => {
        let connection = createConnection(room);
        connection.connect();
        const escapedConversationId = connection.escape(conversationId);
        let query = `INSERT INTO \`chat_messages\` (\`id\`, \`type\`, \`unlock_details\`, \`member_uuid\`, \`chat_room_id\`, \`parent_id\`, \`text\`, \`sent_at\`, \`created_at\`, \`updated_at\`)
            VALUES (NULL, ${connection.escape(messageType)}, ${unlockDetails ? connection.escape(unlockDetails) : 'NULL'}, ${connection.escape(userUuid)}, ${escapedConversationId}, ${parentId ? connection.escape(parentId) : 'NULL'}, ${connection.escape(text)}, ${sentAt ? connection.escape(sentAt) : 'NULL'}, CURRENT_TIMESTAMP(6), CURRENT_TIMESTAMP(6));`;
        connection.query(query, (err, okPacket) => {
            if (!err) {
                const { insertId } = okPacket;
                resolve(insertId);
                const updateQuery = `UPDATE \`chat_rooms\` SET \`last_message_at\`=CURRENT_TIMESTAMP(6) WHERE \`id\`=${escapedConversationId};`;
                connection.query(updateQuery, () => {
                    connection.end();
                });
            }
            else {
                reject(err);
                connection.end();
            }
        });
    });
};
const setUserPurchasedSingleMessageCount = (room, userUuid, count) => {
    let ford = createConnection(room);
    ford.connect();
    let query = `UPDATE \`members\` SET \`purchased_single_text_message_count\`='${ford.escape(count)}' WHERE \`uuid\`=${ford.escape(userUuid)};`;
    ford.query(query, () => {
        ford.end();
    });
};
exports.setUserPurchasedSingleMessageCount = setUserPurchasedSingleMessageCount;
const incrementUserUsedFreeMessageLimitCount = (room, userUuid) => {
    let ford = createConnection(room);
    ford.connect();
    let query = `UPDATE \`members\` SET \`used_free_text_messages_count\`=(\`used_free_text_messages_count\`+1) WHERE \`uuid\`=${ford.escape(userUuid)};`;
    ford.query(query, () => {
        ford.end();
    });
};
exports.incrementUserUsedFreeMessageLimitCount = incrementUserUsedFreeMessageLimitCount;
const increaseUserFreeMessageLimitCount = (room, userUuid, count) => {
    let ford = createConnection(room);
    ford.connect();
    let query = `UPDATE \`members\` SET \`used_free_text_messages_count\`=1,\`free_text_messages_limit\`='${ford.escape(count)}',\`date_of_free_text_messages_limit_set\`='${moment_timezone_1.default().format('YYYY-MM-DD HH:mm:ss')}' WHERE \`uuid\`=${ford.escape(userUuid)};`;
    ford.query(query, () => {
        ford.end();
    });
};
exports.increaseUserFreeMessageLimitCount = increaseUserFreeMessageLimitCount;
