'use strict';

var _get = require('babel-runtime/helpers/get').default;

var _inherits = require('babel-runtime/helpers/inherits').default;

var _createClass = require('babel-runtime/helpers/create-class').default;

var _classCallCheck = require('babel-runtime/helpers/class-call-check').default;

var _Object$assign = require('babel-runtime/core-js/object/assign').default;

var _Promise = require('babel-runtime/core-js/promise').default;

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default').default;

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _liwiLibAbstractStore = require('liwi/lib/AbstractStore');

var _liwiLibAbstractStore2 = _interopRequireDefault(_liwiLibAbstractStore);

var _Cursor = require('./Cursor');

var _Cursor2 = _interopRequireDefault(_Cursor);

var _springbokjsBrowserWebSocket = require('springbokjs-browser/webSocket');

var _springbokjsBrowserWebSocket2 = _interopRequireDefault(_springbokjsBrowserWebSocket);

/** @class ServerStore */
let ServerStore = (function (_AbstractStore) {
    _inherits(ServerStore, _AbstractStore);

    function ServerStore() {
        _classCallCheck(this, ServerStore);

        _get(Object.getPrototypeOf(ServerStore.prototype), 'constructor', this).apply(this, arguments);
    }

    _createClass(ServerStore, [{
        key: 'initialize',
        /** @memberof ServerStore 
        * @instance 
        * @method initialize */value: function initialize() {}
    }, {
        key: 'store',
        /** @memberof ServerStore 
        * @instance 
        * @method store */value: function store() {}
    }, {
        key: 'findOne',
        /** @memberof ServerStore 
        * @instance 
        * @method findOne 
        * @param query 
        * @param options */value: function findOne(query, options) {
            const modelName = this.manager.VO.name[0].toLowerCase() + this.manager.VO.name.substr(1);
            return _springbokjsBrowserWebSocket2.default.emit('db findOne', this.db.dbName, modelName, query, options);
        }
    }, {
        key: 'insert',
        /** @memberof ServerStore 
        * @instance 
        * @method insert 
        * @param options */value: function insert(options) {
            const modelName = this.manager.VO.name[0].toLowerCase() + this.manager.VO.name.substr(1);
            return _springbokjsBrowserWebSocket2.default.emit('db insert', this.db.dbName, modelName, options).then(function (result) {
                if (result) {
                    _Object$assign(options.fullData, result);
                }
            });
        }
    }, {
        key: 'update',
        /** @memberof ServerStore 
        * @instance 
        * @method update 
        * @param options */value: function update(options) {
            throw new Error();
        }
    }, {
        key: 'delete',
        /** @memberof ServerStore 
        * @instance 
        * @method delete 
        * @param options */value: function _delete(options) {
            throw new Error();
        }
    }, {
        key: 'cursor',
        /** @memberof ServerStore 
        * @instance 
        * @method cursor 
        * @param query 
        * @param options */value: function cursor(query, options) {
            var _this = this;

            const modelName = this.manager.VO.name[0].toLowerCase() + this.manager.VO.name.substr(1);
            return _springbokjsBrowserWebSocket2.default.emit('db cursor', this.db.dbName, modelName, query, options).then(function (idCursor) {
                if (!idCursor) {
                    return;
                }

                return new _Cursor2.default(idCursor, _this, query);
            });
        }
    }, {
        key: 'subscribe',
        /** @memberof ServerStore 
        * @instance 
        * @method subscribe 
        * @param listeners */value: function subscribe(listeners) {
            var _this2 = this;

            const modelName = this.manager.VO.name[0].toLowerCase() + this.manager.VO.name.substr(1);
            return _springbokjsBrowserWebSocket2.default.emit('subscribe', this.db.dbName, modelName, listeners.query).then(function (listenerId) {
                listeners.listenerId = listenerId;
                console.log('listing for: ' + listenerId + ' event');
                _springbokjsBrowserWebSocket2.default.on(listenerId + ' event', function (result) {
                    const type = result.type;
                    const data = result.data;

                    console.log('received event', type, data);
                    if (listeners[type]) {
                        listeners[type](_this2.toVO(data));
                    }
                });
            });
        }
    }, {
        key: 'unsubscribe',
        /** @memberof ServerStore 
        * @instance 
        * @method unsubscribe 
        * @param listeners */value: function unsubscribe(listeners) {
            _springbokjsBrowserWebSocket2.default.off(listeners.listenerId + ' event');
            return _springbokjsBrowserWebSocket2.default.emit('unsubscribe ' + listeners.listenerId);
        }
    }]);

    return ServerStore;
})(_liwiLibAbstractStore2.default);

exports.ServerStore = ServerStore;

ServerStore.initialize = /** @function 
                         * @param db */function (db) {
    return _Promise.resolve();
};
//# sourceMappingURL=ServerStore.js.map