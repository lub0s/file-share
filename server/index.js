'use strict'

const process = require('process')

const app = require('./package.json')

const logger = require('pino')({
    prettyPrint: true,
    name: app.name
})

process.on('SIGINT', () => {
    logger.info("SIGINT")
    process.exit(0)
})

process.on('SIGTERM', () => {
    logger.info("SIGTERM")
    process.exit(0)
})

Object.defineProperty(String.prototype, 'hashCode', {
    value: function () {
        var hash = 0, i, chr;
        for (i = 0; i < this.length; i++) {
            chr = this.charCodeAt(i);
            hash = ((hash << 5) - hash) + chr;
            hash |= 0; // Convert to 32bit integer
        }
        return hash;
    }
});

const { nameGenerator, animals, colors } = require('unique-names-generator');

class Server {

    constructor(port) {
        const WebSocket = require('ws');
        this._wss = new WebSocket.Server({ port: port });
        this._wss.on('connection', (socket, request) => this._onConnection(new Connection(socket, request)));
        this._wss.on('headers', (headers, request) => this._onHeaders(headers, request));

        this._rooms = {};

        logger.info('Running on port: %d', port);
    }

    _onConnection(connection) {
        this._joinRoom(connection);
    }

    _onHeaders(headers, request) {
        if (request.headers.cookie && request.headers.cookie.indexOf('connectionid=') > -1) return;
        request.connectionId = Connection.uuid();
        headers.push('Set-Cookie: connectionid=' + request.connectionId + "; SameSite=Strict; Secure");
    }

    _joinRoom(connection) {
        const roomId = connection.roomId;

        if (!this._rooms[roomId]) {
            this._rooms[roomId] = {}
        }

        // notify others in room

        this._rooms[roomId][connection.id] = connection;
    }

    _send(connection, message) {
        if (!connection) return;
        if (this._wss.readyState !== this._wss.OPEN) return;
        message = JSON.stringify(message);
        connection.socket.send(message, error => logger.error('Error: %o, while sending message: %o to connection: %o', error, message, peer));
    }
}

class Connection {

    // return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    static uuid() {
        let uuid = '',
            ii;
        for (ii = 0; ii < 32; ii += 1) {
            switch (ii) {
                case 8:
                case 20:
                    uuid += '-';
                    uuid += (Math.random() * 16 | 0).toString(16);
                    break;
                case 12:
                    uuid += '-';
                    uuid += '4';
                    break;
                case 16:
                    uuid += '-';
                    uuid += (Math.random() * 4 | 8).toString(16);
                    break;
                default:
                    uuid += (Math.random() * 16 | 0).toString(16);
            }
        }
        return uuid;
    }

    constructor(socket, request) {
        this.socket = socket;
        this.roomId = request.url;
        this._setId(request);
        this._generateTempName(request);
    }

    _setId(request) {
        if (request.connectionId) {
            this.id = request.connectionId;
        } else {
            this.id = request.headers.cookie.replace('connectionId=', '');
        }
    }

    _generateTempName(request) {
        // user name generators
    }

}

new Server(process.env.PORT || 3000);
