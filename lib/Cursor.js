'use strict';

var _get = require('babel-runtime/helpers/get').default;

var _inherits = require('babel-runtime/helpers/inherits').default;

var _createClass = require('babel-runtime/helpers/create-class').default;

var _classCallCheck = require('babel-runtime/helpers/class-call-check').default;

var _Promise = require('babel-runtime/core-js/promise').default;

var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default').default;

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _liwiLibAbstractCursor = require('liwi/lib/AbstractCursor');

var _liwiLibAbstractCursor2 = _interopRequireDefault(_liwiLibAbstractCursor);

var _springbokjsBrowserWebSocket = require('springbokjs-browser/webSocket');

var _springbokjsBrowserWebSocket2 = _interopRequireDefault(_springbokjsBrowserWebSocket);

/** @class Cursor 
* @param idCursor 
* @param store 
* @param query */
let Cursor = (function (_AbstractCursor) {
    _inherits(Cursor, _AbstractCursor);

    function Cursor(idCursor, store, query) {
        _classCallCheck(this, Cursor);

        _get(Object.getPrototypeOf(Cursor.prototype), 'constructor', this).call(this);
        this._idCursor = idCursor;
        this._store = store;
        this._query = query;
    }

    _createClass(Cursor, [{
        key: 'advance',
        /** @memberof Cursor 
        * @instance 
        * @method advance 
        * @param count */value: function advance(count) {
            _springbokjsBrowserWebSocket2.default.emit('db cursor ' + this._idCursor, 'advance', count);
            return this;
        }
    }, {
        key: 'next',
        /** @memberof Cursor 
        * @instance 
        * @method next */value: function next() {
            var _this = this;

            return _springbokjsBrowserWebSocket2.default.emit('db cursor ' + this._idCursor, 'next').then(function (result) {
                _this._result = result;
                _this.primaryKey = _this.key = result && result[_this._store.keyPath];
                return _this.key;
            });
        }
    }, {
        key: 'result',
        /** @memberof Cursor 
        * @instance 
        * @method result */value: function result() {
            return _Promise.resolve(this._result);
        }
    }, {
        key: 'remove',
        /** @memberof Cursor 
        * @instance 
        * @method remove */value: function remove() {
            return this._store.deleteByKey(this.key);
        }
    }, {
        key: 'forEachKeys',
        /** @memberof Cursor 
        * @instance 
        * @method forEachKeys 
        * @param callback */value: function forEachKeys(callback) {
            var _this2 = this;

            let promise = _Promise.resolve();
            _springbokjsBrowserWebSocket2.default.on('db cursor forEach ' + this._idCursor, function (result) {
                if (!result) {
                    promise = promise.then(function () {
                        return _this2.close();
                    });
                    return;
                }

                promise = promise.then(function () {
                    _this2._result = result;
                    _this2.primaryKey = _this2.key = result && result[_this2._store.keyPath];
                    return callback(_this2.key);
                });
            });

            return _springbokjsBrowserWebSocket2.default.emit('db cursor ' + this._idCursor, 'forEach').then(function () {
                _springbokjsBrowserWebSocket2.default.off('db cursor forEach ' + _this2._idCursor);
                return promise;
            });
        }
    }, {
        key: 'close',
        /** @memberof Cursor 
        * @instance 
        * @method close */value: function close() {
            var _this3 = this;

            return _springbokjsBrowserWebSocket2.default.emit('db cursor ' + this._idCursor, 'close').then(function () {
                _this3._result = _this3._store = _this3._idCursor = undefined;
            });
        }
    }, {
        key: 'query',
        /** @memberof Cursor 
        * @instance 
        * @member query */get: function get() {
            return this._query;
        }
    }]);

    return Cursor;
})(_liwiLibAbstractCursor2.default);

exports.Cursor = Cursor;
//# sourceMappingURL=Cursor.js.map