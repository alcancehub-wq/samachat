"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionStatus = void 0;
var ConnectionStatus;
(function (ConnectionStatus) {
    ConnectionStatus["CONNECTED"] = "CONNECTED";
    ConnectionStatus["DISCONNECTED"] = "DISCONNECTED";
    ConnectionStatus["RECONNECTING"] = "RECONNECTING";
    ConnectionStatus["WAITING_QR"] = "WAITING_QR";
})(ConnectionStatus || (exports.ConnectionStatus = ConnectionStatus = {}));
