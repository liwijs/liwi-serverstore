import AbstractStore from 'liwi/lib/AbstractStore';
import Cursor from './Cursor';
import webSocket from 'springbokjs-browser/webSocket';

export class ServerStore extends AbstractStore {
    initialize() {
    }

    store() {
    }

    findOne(query, options) {
        const modelName = this.manager.VO.name[0].toLowerCase() + this.manager.VO.name.substr(1);
        return webSocket.emit('db findOne', this.db.dbName, modelName, query, options);
    }

    insert(options) {
        const modelName = this.manager.VO.name[0].toLowerCase() + this.manager.VO.name.substr(1);
        return webSocket.emit('db insert', this.db.dbName, modelName, options).then((result) => {
            if (result) {
                Object.assign(options.fullData, result);
            }
        });
    }

    update(options) {
        throw new Error();
    }

    delete(options) {
        throw new Error();
    }

    cursor(query, options) {
        const modelName = this.manager.VO.name[0].toLowerCase() + this.manager.VO.name.substr(1);
        return webSocket.emit('db cursor', this.db.dbName, modelName, query, options).then((idCursor) => {
            if (!idCursor) {
                return;
            }

            return new Cursor(idCursor, this, query);
        });
    }

    subscribe(listeners) {
        const modelName = this.manager.VO.name[0].toLowerCase() + this.manager.VO.name.substr(1);
        return webSocket.emit('subscribe', this.db.dbName, modelName, listeners.query).then((listenerId) => {
            listeners.listenerId = listenerId;
            console.log('listing for: ' + listenerId + ' event');
            webSocket.on(listenerId + ' event', (result) => {
                const { type, data } = result;
                console.log('received event', type, data);
                if (listeners[type]) {
                    listeners[type](this.toVO(data));
                }
            });
        });
    }

    unsubscribe(listeners) {
        webSocket.off(listeners.listenerId + ' event');
        return webSocket.emit('unsubscribe ' + listeners.listenerId);
    }
}

ServerStore.initialize = function(db) {
    return Promise.resolve();
};
