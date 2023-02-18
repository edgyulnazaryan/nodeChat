"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const factories_1 = require("../factories");
const utils_1 = __importDefault(require("./utils"));
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const path_1 = __importDefault(require("path"));
const db_interactions_1 = require("../db-interactions");
const userConnections_1 = __importDefault(require("./userConnections"));
const _1 = require(".");
const axios_1 = __importDefault(require("axios"));
const messageTextMessageMaxLength = 20000;
const moduleForExport = (socket, callback) => {
    console.log(23232323)
    __bindTypingEvent(socket);
    __bindMessageUpdateEvent(socket);
    __bindMessageDeleteEvent(socket);
    __bindMessageLikeEvent(socket);
    __bindMessageSendEvent(socket);
    __bindConversationReadEvent(socket);
    if (callback) {
        callback();
    }
};
const __bindConversationReadEvent = (socket) => {
    socket.removeAllListeners('conversation:read');
    socket.on('conversation:read', async (data, cb) => {
        try {
            /* validate payload start */
            if (!data) {
                data = {};
            }
            const { authInfo: { authUserUuid }, data: { room } } = socket;
            const authUser = userConnections_1.default.getAuthUser(room, authUserUuid);
            const { uuid: userUuid } = authUser;
            const { conversationId, } = data;
            if (!utils_1.default.isInt(conversationId)) {
                if (cb) {
                    cb({
                        error: 'incorrect_payload',
                    });
                }
                return;
            }
            /* validate payload end */
            let conversation;
            try {
                conversation = await db_interactions_1.getConversation(room, conversationId);
            }
            catch (e) {
                conversation = {};
            }
            const { type: conversationType, userUuids = [] } = conversation;
            if (!['public', 'private'].includes(conversationType) || 'public' === conversationType || ('private' === conversationType && !userUuids.includes(userUuid))) {
                if (cb) {
                    cb({
                        error: 'access_denied',
                    });
                }
                return;
            }
            removeUnreadCount(room, conversationId, userUuid).then((payload) => {
                const { needToEmit, lastSeenTime } = payload;
                if (needToEmit) {
                    const authUserRoomName = `authRoom:${room}:user:${userUuid}`;
                    const payload = {
                        conversationId: conversationId,
                    };
                    socket.to(authUserRoomName).emit('conversation:read', payload); // sending to auth user room except sender
                    const toUserUuid = userUuids.find((uuid) => uuid !== userUuid);
                    const privateUserRoomName = `authRoom:${room}:user:${toUserUuid}`;
                    socket.to(privateUserRoomName).emit('conversation:seen', {
                        ...payload,
                        lastSeenTime
                    }); // sending to private user room except sender
                }
            }).catch(() => {
                if (cb) {
                    cb({
                        error: 'internal_server_error',
                    });
                }
            });
        }
        catch (e) {
            console.log(e);
            if (cb) {
                cb({
                    error: 'internal_server_error',
                });
            }
        }
    });
};
const __bindMessageUpdateEvent = (socket) => {

    socket.removeAllListeners('message:update');
    socket.on('message:update', async (data, cb) => {
        try {
            /* validate payload start */
            if (!data) {
                data = {};
            }
            const { authInfo: { authUserUuid }, data: { room } } = socket;
            const authUser = userConnections_1.default.getAuthUser(room, authUserUuid);
            const { uuid: userUuid } = authUser;
            const { messageId, text, conversationId, } = data;
            const transformedMessage = utils_1.default.transformMessage(text);
            if (!utils_1.default.isInt(conversationId) ||
                !utils_1.default.isInt(messageId) ||
                lodash_1.isEmpty(transformedMessage)) {
                if (cb) {
                    cb({
                        error: 'incorrect_payload',
                    });
                }
                return;
            }
            /* validate payload end */
            if (transformedMessage.length > messageTextMessageMaxLength) {
                if (cb) {
                    cb({
                        error: 'message_too_long',
                    });
                }
                return;
            }
            let conversation;
            try {
                conversation = await db_interactions_1.getConversation(room, conversationId);
            }
            catch (e) {
                conversation = {};
            }
            const { type: conversationType, userUuids = [] } = conversation;
            if (!['public', 'private'].includes(conversationType) || 'private' === conversationType && !userUuids.includes(userUuid)) {
                if (cb) {
                    cb({
                        error: 'access_denied',
                    });
                }
                return;
            }
            db_interactions_1.updateMessage(room, messageId, text, userUuid, conversationId);
            const publicRoomName = `authRoom:${room}`;
            const payload = {
                conversationId: conversationId,
                message: {
                    id: messageId,
                    text: transformedMessage,
                }
            };
            switch (conversationType) {
                case 'public': {
                    socket.to(publicRoomName).emit('message:update', payload); // sending to all clients in room except sender
                    break;
                }
                case 'private': {
                    const authUserRoomName = `authRoom:${room}:user:${userUuid}`;
                    const toUserUuid = userUuids.find((uuid) => uuid !== userUuid);
                    const privateUserRoomName = `authRoom:${room}:user:${toUserUuid}`;
                    socket.to(authUserRoomName).emit('message:update', payload); // sending to auth user room except sender
                    socket.to(privateUserRoomName).emit('message:update', payload); // sending to private user room except sender
                    break;
                }
            }
        }
        catch (e) {
            console.log(e);
            if (cb) {
                cb({
                    error: 'internal_server_error',
                });
            }
        }
    });
};
const __bindMessageDeleteEvent = (socket) => {
    socket.removeAllListeners('message:delete');
    socket.on('message:delete', async (data, cb) => {
        try {
            /* validate payload start */
            if (!data) {
                data = {};
            }
            const { authInfo: { authUserUuid }, data: { room } } = socket;
            const authUser = userConnections_1.default.getAuthUser(room, authUserUuid);
            const { uuid: userUuid, admin: isAuthUserAdmin } = authUser;
            const { messageId, conversationId, } = data;
            if (!utils_1.default.isInt(conversationId) ||
                !utils_1.default.isInt(messageId)) {
                if (cb) {
                    cb({
                        error: 'incorrect_payload',
                    });
                }
                return;
            }
            /* validate payload end */
            let conversation;
            try {
                conversation = await db_interactions_1.getConversation(room, conversationId);
            }
            catch (e) {
                conversation = {};
            }
            const { type: conversationType, userUuids = [] } = conversation;
            if (!['public', 'private'].includes(conversationType) || 'private' === conversationType && !userUuids.includes(userUuid)) {
                if (cb) {
                    cb({
                        error: 'access_denied',
                    });
                }
                return;
            }
            db_interactions_1.deleteMessage(room, messageId, userUuid, conversationId, isAuthUserAdmin);
            const publicRoomName = `authRoom:${room}`;
            const payload = {
                conversationId: conversationId,
                messageId,
            };
            switch (conversationType) {
                case 'public': {
                    socket.to(publicRoomName).emit('message:delete', payload); // sending to all clients in room except sender
                    break;
                }
                case 'private': {
                    const authUserRoomName = `authRoom:${room}:user:${userUuid}`;
                    const toUserUuid = userUuids.find((uuid) => uuid !== userUuid);
                    const privateUserRoomName = `authRoom:${room}:user:${toUserUuid}`;
                    socket.to(authUserRoomName).emit('message:delete', payload); // sending to auth user room except sender
                    socket.to(privateUserRoomName).emit('message:delete', payload); // sending to private user room except sender
                    break;
                }
            }
        }
        catch (e) {
            console.log(e);
            if (cb) {
                cb({
                    error: 'internal_server_error',
                });
            }
        }
    });
};
const __bindMessageLikeEvent = (socket) => {
    socket.removeAllListeners('message:like');
    socket.on('message:like', async (data, cb) => {
        try {
            /* validate payload start */
            if (!data) {
                data = {};
            }
            const { authInfo: { authUserUuid }, data: { room } } = socket;
            const authUser = userConnections_1.default.getAuthUser(room, authUserUuid);
            const { uuid: userUuid } = authUser;
            const { messageId, conversationId, isLiked, } = data;
            if (!utils_1.default.isInt(conversationId) ||
                !utils_1.default.isInt(messageId) ||
                !lodash_1.isBoolean(isLiked)) {
                if (cb) {
                    cb({
                        error: 'incorrect_payload',
                    });
                }
                return;
            }
            /* validate payload end */
            let conversation;
            try {
                conversation = await db_interactions_1.getConversation(room, conversationId);
            }
            catch (e) {
                conversation = {};
            }
            const { type: conversationType, userUuids = [] } = conversation;
            if (!['public', 'private'].includes(conversationType) || 'private' === conversationType && !userUuids.includes(userUuid)) {
                if (cb) {
                    cb({
                        error: 'access_denied',
                    });
                }
                return;
            }
            // db_interactions_1.toggleMessageLike(room, messageId, userUuid, isLiked);
            const publicRoomName = `authRoom:${room}`;
            const payload = {
                conversationId,
                messageId,
                isLiked,
                user: utils_1.default.transformUserForEmit(authUser),
            };
            switch (conversationType) {
                case 'public': {
                    socket.to(publicRoomName).emit('message:like', payload); // sending to all clients in room except sender
                    break;
                }
                case 'private': {
                    const authUserRoomName = `authRoom:${room}:user:${userUuid}`;
                    const toUserUuid = userUuids.find((uuid) => uuid !== userUuid);
                    const privateUserRoomName = `authRoom:${room}:user:${toUserUuid}`;
                    socket.to(authUserRoomName).emit('message:like', payload); // sending to auth user room except sender
                    socket.to(privateUserRoomName).emit('message:like', payload); // sending to private user room except sender
                    break;
                }
            }
        }
        catch (e) {
            console.log(e);
            if (cb) {
                cb({
                    error: 'internal_server_error',
                });
            }
        }
    });
};
const __bindMessageSendEvent = (socket) => {
    console.log(44444)
    socket.removeAllListeners('message:send');
    socket.on('message:send', async (data, cb) => {
        try {
            /* get auth user and room start */
            const { authInfo: { authUserUuid }, data: { room } } = socket;
            const authUser = userConnections_1.default.getAuthUser(room, authUserUuid);
            const { uuid: userUuid, admin: isAuthUserAdmin, } = authUser;
            /* get auth user and room end */
            /* validate payload start */
            if (!data) {
                data = {};
            }
            const allowedTypes = [
                'text_message',
                'photo_unlock',
                'video_unlock'
            ];
            const { type = 'text_message', text, conversationId, sentAt, parentMessageId = null, resources = null, unlockPrice = null, duration, coverImage, blurhash, lockedPosterIsBlur, isUnlocked, resourceId, resourceType } = data;
            if (!allowedTypes.includes(type)) {
                if (cb) {
                    cb({
                        error: 'incorrect_payload',
                    });
                }
                return;
            }
            const transformedMessage = utils_1.default.transformMessage(text);
            switch (type) {
                case 'text_message': {
                    if (!utils_1.default.isInt(conversationId) ||
                        !utils_1.default.isInt(sentAt) ||
                        lodash_1.isEmpty(transformedMessage) ||
                        (null !== parentMessageId && !utils_1.default.isInt(parentMessageId))) {
                        if (cb) {
                            cb({
                                error: 'incorrect_payload',
                            });
                        }
                        return;
                    }
                    break;
                }
                case 'video_unlock':
                case 'photo_unlock': {
                    if (!isAuthUserAdmin) {
                        if (cb) {
                            cb({
                                error: 'access_denied',
                            });
                        }
                        return;
                    }
                    if (!utils_1.default.isInt(conversationId) ||
                        !utils_1.default.isInt(sentAt) ||
                        (null !== parentMessageId && !utils_1.default.isInt(parentMessageId)) ||
                        !Array.isArray(resources) ||
                        Array.isArray(resources) && resources.length === 0 ||
                        typeof unlockPrice !== 'number') {
                        if (cb) {
                            cb({
                                error: 'incorrect_payload',
                            });
                        }
                        return;
                    }
                    break;
                }
            }
            /* validate payload end */
            let transformedDate = moment_timezone_1.default(sentAt).format('YYYY-MM-DD HH:mm:ss.SSSSSS');
            if ('Invalid date' === transformedDate) {
                transformedDate = moment_timezone_1.default().format('YYYY-MM-DD HH:mm:ss.SSSSSS');
            }
            let dateToEmit = moment_timezone_1.default(sentAt).toISOString();
            if ('Invalid date' === dateToEmit) {
                dateToEmit = moment_timezone_1.default().toISOString();
            }
            /* function to send a message */
            const sendMessage = async (room, transformedMessage, transformedDate, userUuid, conversationId, parentMessageId, conversationType, userUuids, messageType, resources, unlockPrice) => {
                try {
                    let messageId;
                    switch (messageType) {
                        case 'text_message': {
                            messageId = await db_interactions_1.createTextMessage(room, transformedMessage, transformedDate, userUuid, conversationId, parentMessageId);
                            break;
                        }
                        case 'photo_unlock':
                        case 'video_unlock': {
                            messageId = await db_interactions_1.createResourcesMessage(room, transformedMessage, transformedDate, userUuid, conversationId, parentMessageId, resources, unlockPrice, messageType, duration, coverImage, blurhash, lockedPosterIsBlur, isUnlocked, resourceId, resourceType);
                            break;
                        }
                    }
                    const finish = (messageId, parentMessage, messageType, unlockPrice, cb) => {
                        const publicRoomName = `authRoom:${room}`;
                        const message = {
                            id: messageId,
                            text: transformedMessage,
                            parentMessage: parentMessage,
                            type: messageType,
                            sentAt: dateToEmit
                        };
                        if ('photo_unlock' === messageType) {
                            let photoCoverImage = Array.isArray(resources) ? resources[0] : null;
                            if (photoCoverImage) {
                                photoCoverImage = utils_1.default.getCdnLink(`images/${photoCoverImage}`);
                            }
                            message.unlockDetails = {
                                is_unlocked: !!isUnlocked,
                                unlock_price: unlockPrice,
                                cover: photoCoverImage,
                                photos_count: Array.isArray(resources) ? resources.length : 0,
                                photos_blurhash: blurhash,
                                locked_poster_is_blur: lockedPosterIsBlur,
                                resource_id: resourceId,
                                resource_type: resourceType
                            };
                        }
                        if ('video_unlock' === messageType) {
                            let videoCoverImage = coverImage;
                            let basename = Array.isArray(resources) ? resources[0] : null;
                            if (videoCoverImage && basename) {
                                basename = path_1.default.basename(basename, path_1.default.extname(basename));
                                videoCoverImage = utils_1.default.getCdnLink(`videos/${basename}/outputs/thumbnails/${videoCoverImage}`);
                            }
                            message.unlockDetails = {
                                is_unlocked: !!isUnlocked,
                                unlock_price: unlockPrice,
                                cover: videoCoverImage,
                                video_duration: duration,
                                locked_poster_is_blur: lockedPosterIsBlur,
                                resource_id: resourceId,
                                resource_type: resourceType
                            };
                        }
                        const payload = {
                            user: utils_1.default.transformUserForEmit(authUser),
                            conversationId,
                            message
                        };
                        if (cb) {
                            cb({
                                data: {
                                    messageId,
                                    parentMessage
                                }
                            });
                        }
                        switch (conversationType) {
                            case 'public': {
                                socket.to(publicRoomName).emit('message:send', payload); // sending to all clients in room except sender
                                console.log(111)
                                break;
                            }
                            case 'private': {
                                const authUserRoomName = `authRoom:${room}:user:${userUuid}`;
                                socket.to(authUserRoomName).emit('message:send', payload); // sending to auth user room except sender
                                console.log(456456546546)
                                const toUserUuid = userUuids.find((uuid) => uuid !== userUuid);
                                addUnreadCount(room, conversationId, toUserUuid);
                                const privateUserRoomName = `authRoom:${room}:user:${toUserUuid}`;
                                let payloadToSecondUser = {
                                    ...payload
                                };
                                if ('photo_unlock' === payloadToSecondUser.message.type && payloadToSecondUser.message.unlockDetails && !!payloadToSecondUser.message.unlockDetails.locked_poster_is_blur && (payloadToSecondUser.message.unlockDetails.unlock_price > 0) && !payloadToSecondUser.message.unlockDetails.is_unlocked) {
                                    payloadToSecondUser = {
                                        ...payloadToSecondUser,
                                        message: {
                                            ...payloadToSecondUser.message,
                                            unlockDetails: {
                                                ...payloadToSecondUser.message.unlockDetails,
                                                cover: null
                                            }
                                        }
                                    };
                                }
                                socket.to(privateUserRoomName).emit('message:send', payloadToSecondUser); // sending to private user room except sender
                                console.log(2222)
                                break;
                            }
                        }
                        if ('photo_unlock' === messageType || 'video_unlock' === messageType) {
                            const payload = {
                                messageId,
                                room,
                            };
                            let protocol = 'https://';
                            if ('local' === process.env.NODE_ENV) {
                                protocol = 'http://';
                            }
                            axios_1.default.post(`${protocol}system.${process.env.DOMAIN}/send-email`, payload).then(() => { }).catch(() => { });
                        }
                    };
                    if (parentMessageId) {
                        const connection = db_interactions_1.createConnection(room);
                        connection.connect();
                        const query = `SELECT \`chat_messages\`.\`text\`, \`members\`.\`username\`, \`members\`.\`admin\` FROM \`chat_messages\` LEFT JOIN \`members\` ON \`members\`.\`uuid\`=\`chat_messages\`.\`member_uuid\` WHERE \`chat_messages\`.\`id\`='${parentMessageId}';`;
                        connection.query(query, async (err, results) => {
                            connection.end();
                            if (!err && results[0]) {
                                try {
                                    const parentMessageText = results[0].text;
                                    let parentMessageUserUsername = results[0].username;
                                    const isAdmin = results[0].admin;
                                    if (isAdmin) {
                                        parentMessageUserUsername = await getAdminScreenName(room);
                                    }
                                    const parentMessage = {
                                        text: parentMessageText,
                                        user: {
                                            username: parentMessageUserUsername
                                        }
                                    };
                                    finish(messageId, parentMessage, messageType, unlockPrice, cb);
                                }
                                catch (e) {
                                    if (cb) {
                                        cb({
                                            error: 'internal_server_error',
                                        });
                                    }
                                }
                            }
                        });
                    }
                    else {
                        try {
                            finish(messageId, null, messageType, unlockPrice, cb);
                        }
                        catch (e) {
                            if (cb) {
                                cb({
                                    error: 'internal_server_error',
                                });
                            }
                        }
                    }
                }
                catch (e) {
                    console.log(e);
                    if (cb) {
                        cb({
                            error: 'internal_server_error',
                        });
                    }
                }
            };
            /* function to check errors and emit with callback */
            const checkForErrors = (cb, authUser, conversationType, userUuids, transformedMessage) => {
                if ('private' === conversationType && !userUuids.includes(authUser.uuid)) {
                    if (cb) {
                        cb({
                            error: 'access_denied',
                        });
                    }
                    return true;
                }
                if (authUser.muted_since) {
                    if (cb) {
                        cb({
                            error: 'messaging_is_muted',
                            data: {
                                muted_since: authUser.muted_since,
                                mute_period_in_seconds: authUser.mute_period_in_seconds,
                            }
                        });
                    }
                    return true;
                }
                if (transformedMessage.length > messageTextMessageMaxLength) {
                    if (cb) {
                        cb({
                            error: 'message_too_long',
                        });
                    }
                    return true;
                }
                return false;
            };
            let conversation;
            try {
                conversation = await db_interactions_1.getConversation(room, conversationId);
            }
            catch (e) {
                conversation = {};
            }
            const { type: conversationType, // public or private
            userUuids = [], } = conversation;
            if (!['public', 'private'].includes(conversationType)) {
                if (cb) {
                    cb({
                        error: 'access_denied',
                    });
                }
                return;
            }
            const chatSettings = await db_interactions_1.getChatSettings(room);
            const memberType = utils_1.default.checkUserType(authUser);
            const chatAvailabilityMode = utils_1.default.checkChatAvailabilityMode(memberType, conversationType, chatSettings);
            switch (chatAvailabilityMode) {
                case 'on': {
                    const haveError = checkForErrors(cb, authUser, conversationType, userUuids, transformedMessage);
                    if (haveError) {
                        return;
                    }
                    sendMessage(room, transformedMessage, transformedDate, userUuid, conversationId, parentMessageId, conversationType, userUuids, type, resources, unlockPrice);
                    break;
                }
                case 'off': {
                    if (cb) {
                        cb({
                            error: 'conversation_is_not_active',
                        });
                    }
                    return;
                }
                case 'payed': {
                    const haveError = checkForErrors(cb, authUser, conversationType, userUuids, transformedMessage);
                    if (haveError) {
                        return;
                    }
                    const freeMessageLimitSlug = utils_1.default.checkFreeMessageLimit(authUser, memberType, chatSettings);
                    switch (freeMessageLimitSlug) {
                        case 'have_limit_and_need_to_increment': {
                            // send message and increment limit
                            db_interactions_1.incrementUserUsedFreeMessageLimitCount(room, userUuid);
                            userConnections_1.default.updateAuthUser(room, userUuid, {
                                used_free_text_messages_count: authUser.used_free_text_messages_count + 1,
                            });
                            _1.UserGetter.setUserInStorage(room, userUuid, userConnections_1.default.getAuthUser(room, userUuid));
                            sendMessage(room, transformedMessage, transformedDate, userUuid, conversationId, parentMessageId, conversationType, userUuids, type, resources, unlockPrice);
                            break;
                        }
                        case 'have_limit_and_need_to_increase': {
                            // send message and emit signal to increase limit
                            const count = chatSettings['chat_private_active_members_payed_messaging_payload']['free_text_messages_rules']['number_of_free_messages'];
                            db_interactions_1.increaseUserFreeMessageLimitCount(room, userUuid, count);
                            userConnections_1.default.updateAuthUser(room, userUuid, {
                                free_text_messages_limit: count,
                                used_free_text_messages_count: 1,
                                date_of_free_text_messages_limit_set: moment_timezone_1.default().toISOString(),
                            });
                            _1.UserGetter.setUserInStorage(room, userUuid, userConnections_1.default.getAuthUser(room, userUuid));
                            sendMessage(room, transformedMessage, transformedDate, userUuid, conversationId, parentMessageId, conversationType, userUuids, type, resources, unlockPrice);
                            break;
                        }
                        case 'no_limit': {
                            const purchasedSingleTextMessageCount = authUser.purchased_single_text_message_count;
                            if (purchasedSingleTextMessageCount > 0) {
                                // send message and emit signal to decremnt user payed value for text message
                                const newPurchasedSingleTextMessageCount = purchasedSingleTextMessageCount - 1;
                                db_interactions_1.setUserPurchasedSingleMessageCount(room, userUuid, newPurchasedSingleTextMessageCount);
                                userConnections_1.default.updateAuthUser(room, userUuid, {
                                    purchased_single_text_message_count: newPurchasedSingleTextMessageCount,
                                });
                                _1.UserGetter.setUserInStorage(room, userUuid, userConnections_1.default.getAuthUser(room, userUuid));
                                sendMessage(room, transformedMessage, transformedDate, userUuid, conversationId, parentMessageId, conversationType, userUuids, type, resources, unlockPrice);
                            }
                            else {
                                if (cb) {
                                    const priceForTextMessage = chatSettings[`chat_private_${memberType}_members_payed_messaging_payload`]['price_for_text_message'];
                                    cb({
                                        error: 'payment_required',
                                        data: {
                                            price_for_text_message: priceForTextMessage,
                                            wallet_balance: authUser.wallet_balance,
                                        }
                                    });
                                }
                                return;
                            }
                            break;
                        }
                    }
                    break;
                }
            }
        }
        catch (e) {
            if (cb) {
                cb({
                    error: 'internal_server_error',
                });
            }
            console.log(e);
        }
    });
};
const __bindTypingEvent = (socket) => {
    console.log('SS')
    socket.removeAllListeners('typing');
    socket.on('typing', async (data, cb) => {
        try {
            /* validate payload start */
            if (!data) {
                data = {};
            }
            const { authInfo: { authUserUuid }, data: { room } } = socket;
            const authUser = userConnections_1.default.getAuthUser(room, authUserUuid);
            const { uuid: userUuid } = authUser;
            const { conversationId, } = data;
            if (!utils_1.default.isInt(conversationId)) {
                if (cb) {
                    cb({
                        error: 'incorrect_payload',
                    });
                }
                return;
            }
            /* validate payload end */
            let conversation;
            try {
                conversation = await db_interactions_1.getConversation(room, conversationId);
            }
            catch (e) {
                conversation = {};
            }
            const { type: conversationType, userUuids = [] } = conversation;
            if (!['public', 'private'].includes(conversationType) || 'private' === conversationType && !userUuids.includes(userUuid)) {
                if (cb) {
                    cb({
                        error: 'access_denied',
                    });
                }
                return;
            }
            const publicRoomName = `authRoom:${room}`;
            const payload = {
                conversationId,
                user: utils_1.default.transformUserForEmit(authUser),
            };
            switch (conversationType) {
                case 'public': {
                    socket.to(publicRoomName).emit('typing', payload); // sending to all clients in room except sender
                    break;
                }
                case 'private': {
                    const toUserUuid = userUuids.find((uuid) => uuid !== userUuid);
                    const privateUserRoomName = `authRoom:${room}:user:${toUserUuid}`;
                    socket.to(privateUserRoomName).emit('typing', payload); // sending to private user room except sender
                    break;
                }
            }
        }
        catch (e) {
            console.log(e);
            if (cb) {
                cb({
                    error: 'internal_server_error',
                });
            }
        }
    });
};
/* helper functions start */
const getAdminScreenName = (room) => {
    const connection = db_interactions_1.createConnection(room);
    const query = `SELECT \`value\` FROM \`settings\` WHERE \`key\`='admin_screen_name';`;
    return new Promise((resolve, reject) => {
        connection.query(query, (err, results) => {
            connection.end();
            if (!err) {
                const value = results[0].value;
                resolve(value);
            }
            else {
                reject(err);
            }
        });
    });
};
const addUnreadCount = (room, conversationId, userUuid) => {
    const key = `chat:room:${room}:conversation:${conversationId}:user:${userUuid}`;
    const redisDataClient = factories_1.RedisFactory.getDataClient();
    redisDataClient.get(key, (err, reply) => {
        let info = {};
        if (reply) {
            info = JSON.parse(reply);
            info.unread_count++;
        }
        else {
            info.last_seen = null;
            info.unread_count = 1;
        }
        redisDataClient.set(key, JSON.stringify(info));
    });
};
const removeUnreadCount = (room, conversationId, userUuid) => {
    return new Promise((resolve) => {
        const key = `chat:room:${room}:conversation:${conversationId}:user:${userUuid}`;
        const redisDataClient = factories_1.RedisFactory.getDataClient();
        redisDataClient.get(key, (err, reply) => {
            let info = {};
            let needToSave = true;
            const lastSeenTime = moment_timezone_1.default().toISOString();
            if (reply) {
                info = JSON.parse(reply);
                if (0 === info.unread_count) {
                    needToSave = false;
                }
                info.unread_count = 0;
                info.last_seen = lastSeenTime;
            }
            else {
                info.unread_count = 0;
                info.last_seen = lastSeenTime;
            }
            if (needToSave) {
                redisDataClient.set(key, JSON.stringify(info));
            }
            resolve({
                needToEmit: needToSave,
                lastSeenTime
            });
        });
    });
};
/* helper functions end */
exports.default = moduleForExport;
