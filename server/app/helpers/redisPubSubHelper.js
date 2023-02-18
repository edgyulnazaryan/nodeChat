"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const factories_1 = require("../factories");
const constants_1 = require("../constants");
const _1 = require(".");
class RedisPubSubHelper {
    static init() {

        const redisPubSubClient = factories_1.RedisFactory.getPubSubClient();
        const io = factories_1.ServerFactory.getIo();
        /*****************************
        Subscribe TipRedis chanel
        ******************************/
        redisPubSubClient.pSubscribe("*");
        /*****************************
        Fire Event after redis publish
        Emit new event to Room
        ******************************/
        redisPubSubClient.on("pmessage", (_, channel, event_data) => {

            var event = JSON.parse(event_data);
            if (['user:unmute', 'user:mute'].includes(channel)) {
                const { room, admin_uuid: adminUuid, user_uuid: userUuid, mute_info: muteInfo } = event;
                const adminUserRoomName = `authRoom:${room}:user:${adminUuid}`;
                const mutedUserRoomName = `authRoom:${room}:user:${userUuid}`;
                switch (channel) {
                    case 'user:mute': {
                        _1.UserConnections.updateAuthUser(room, userUuid, muteInfo);
                        io.of(constants_1.CHAT_NAMESPACE)
                            .in(adminUserRoomName)
                            .emit(channel, { userUuid, muteInfo });
                        io.of(constants_1.CHAT_NAMESPACE)
                            .in(mutedUserRoomName)
                            .emit(channel, { muteInfo });
                        break;
                    }
                    case 'user:unmute': {
                        io.of(constants_1.CHAT_NAMESPACE)
                            .in(adminUserRoomName)
                            .emit(channel, { userUuid });
                        io.of(constants_1.CHAT_NAMESPACE)
                            .in(mutedUserRoomName)
                            .emit(channel);
                        _1.UserConnections.updateAuthUser(room, userUuid, {
                            muted_since: null,
                            mute_period_in_seconds: null,
                        });
                        break;
                    }
                }
            }
            else if ('chat:userUpdate' === channel) {
                const { room, user } = event;
                _1.UserConnections.updateAuthUser(room, user.uuid, user);
            }
            else if ('chat:massMessage' === channel) {
                const { room, message, usersToEmit } = event;
                usersToEmit.forEach((toUserUuid) => {
                    const privateUserRoomName = `authRoom:${room}:user:${toUserUuid}`;
                    io.of(constants_1.CHAT_NAMESPACE)
                        .in(privateUserRoomName).emit('message:send', message); // sending to private user room
                    console.log(2222222222222222222222)
                });
            }
            else if ('chat:updateContentMessage' === channel) {
                const { room, data, admin_uuid, user_uuid, } = event;
                const privateUserRoomName = `authRoom:${room}:user:${user_uuid}`;
                const adminUserRoomName = `authRoom:${room}:user:${admin_uuid}`;
                io.of(constants_1.CHAT_NAMESPACE)
                    .in(privateUserRoomName).emit('message:update', data); // sending to private user room
                io.of(constants_1.CHAT_NAMESPACE)
                    .in(adminUserRoomName).emit('message:update', data); // sending to private auth user room
            }
            else {
                const { uuid: room, data } = event;
                switch (channel) {
                    // STORY COMMENT /
                    case 'member.block': {
                        io.of(constants_1.MEMBER_AREA_NAMESPACE)
                            .in(room)
                            .emit(channel, data);
                        break;
                    }
                    case 'videoComment.toggleLike':
                    case 'videoComment.delete':
                    case 'videoComment.add':
                    case 'photosetComment.toggleLike':
                    case 'photosetComment.delete':
                    case 'photosetComment.add':
                    case 'storyComment.toggleLike':
                    case 'storyComment.delete':
                    case 'storyComment.add': {
                        io.of(constants_1.COMMENTS_EVENTS_NAMESPACE)
                            .in(room)
                            .emit(channel, data);
                        break;
                    }
                    case 'uploads.video-update': {
                        io.of(constants_1.UPLOADS_EVENTS_NAMESPACE)
                            .in(room)
                            .emit(channel, data);
                        break;
                    }
                    default:
                        break;
                }
            }
        });
    }
}
exports.default = RedisPubSubHelper;
