"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const moment_timezone_1 = __importDefault(require("moment-timezone"));
const env_1 = __importDefault(require("../helpers/env"));
const cfsign = require('aws-cloudfront-sign');
class Utils {
    static transformMessage(message) {
        if (!message || 'string' !== typeof message) {
            return '';
        }
        return message.replace(/^\s+|\s+$/g, '');
    }
    static isInt(value) {
        const parsed = parseInt(value);
        if (isNaN(parsed)) {
            return false;
        }
        return lodash_1.isNumber(parsed);
    }
    static transformUserForEmit(user) {
        return {
            uuid: user.uuid,
            username: user.username,
            avatar: user.avatar,
        };
    }
    static checkUserType(user) {
        let type;
        if (user.admin) {
            type = 'admin';
        }
        else {
            type = 'guest';
            if (user.subscriber) {
                type = 'active';
            }
            else {
                if (user.ever_subscribed) {
                    type = 'expired';
                }
            }
        }
        return type;
    }
    static checkChatAvailabilityMode(memberType, conversationType, chatSettings) {
        let mode = 'off';
        switch (conversationType) {
            case 'public': {
                switch (memberType) {
                    case 'admin': {
                        mode = 'on';
                        break;
                    }
                    case 'active': {
                        if (chatSettings['chat_group_is_active']) {
                            mode = 'on';
                        }
                        break;
                    }
                }
                break;
            }
            case 'private': {
                switch (memberType) {
                    case 'admin': {
                        mode = 'on';
                        break;
                    }
                    case 'active':
                    case 'guest':
                    case 'expired': {
                        const key = `chat_private_${memberType}_members_messaging_mode`;
                        mode = chatSettings[key];
                        break;
                    }
                }
                break;
            }
        }
        return mode;
    }
    static checkFreeMessageLimit(authUser, memberType, chatSettings) {
        const freeTextMessagesLimit = authUser.free_text_messages_limit;
        const usedFreeTextMessagesCount = authUser.used_free_text_messages_count;
        const dateOfFreeTextMessagesLimitSet = authUser.date_of_free_text_messages_limit_set;
        const freeTextMessagesRules = chatSettings['chat_private_active_members_payed_messaging_payload']['free_text_messages_rules']['mode'];
        const numberOfFreeMessages = chatSettings['chat_private_active_members_payed_messaging_payload']['free_text_messages_rules']['number_of_free_messages'];
        let result = freeTextMessagesLimit > 0 && usedFreeTextMessagesCount < freeTextMessagesLimit ? 'have_limit_and_need_to_increment' : 'no_limit';
        if ('active' === memberType && 'no_limit' === result
            && numberOfFreeMessages > 0 && 'for_all_members_every_30_days' === freeTextMessagesRules
            && (!dateOfFreeTextMessagesLimitSet || moment_timezone_1.default(dateOfFreeTextMessagesLimitSet).add(30, 'days').diff(moment_timezone_1.default()) < 0)) {
            result = 'have_limit_and_need_to_increase';
        }
        return result;
    }
}
Utils.getCdnLink = (path) => {
    const signingParams = {
        keypairId: env_1.default.CF_KEY_PAIR_ID,
        privateKeyPath: env_1.default.CF_PRIVATE_KEY_PATH,
        expireTime: moment_timezone_1.default().add(1, 'day'),
    };
    const cdnDomain = env_1.default.CF_WEB_DISTRIBUTION_DOMAIN; // TODO encoded CDN link with query parameters
    let formattedPath = path;
    if ('/' !== path[0]) {
        formattedPath = `/${path}`;
    }
    return 'https://' + cfsign.getSignedUrl(`${cdnDomain}${formattedPath}`, signingParams);
};
exports.default = Utils;
