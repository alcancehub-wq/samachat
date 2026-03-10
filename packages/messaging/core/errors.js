"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingError = void 0;
class MessagingError extends Error {
    code;
    details;
    constructor(message, code = 'MESSAGING_ERROR', details) {
        super(message);
        this.code = code;
        this.details = details;
    }
}
exports.MessagingError = MessagingError;
