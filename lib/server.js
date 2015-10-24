'use strict';

var _Map = require('babel-runtime/core-js/map').default;

exports.initialize = /** @function 
                     * @param io 
                     * @param serverStore */function (io, serverStore) {
    io.on('connection', /** @function 
                        * @param socket */function (socket) {
        let openCursors = new _Map();
        let timeouts = new _Map();
        let activeListeners = new _Map();

        socket.on('disconnect', /** @function */function () {
            openCursors.forEach(function (cursor) {
                return cursor.close();
            });
            openCursors.clear();
            openCursors = null;

            timeouts.forEach(function (timeout) {
                return clearTimeout(timeout);
            });
            timeouts.clear();
            timeouts = null;

            activeListeners.forEach(function (activeListener) {
                activeListener.service.unsubscribe(activeListener.listeners);
            });

            activeListeners.clear();
            activeListeners = null;
        });

        socket.on('connectedUser', /** @function 
                                   * @param response */function (response) {
            const userRestService = serverStore.restService('user');
            userRestService.findConnected(socket.connectedUser).then(function (user) {
                if (!user) {
                    return response(null);
                }

                response(null, {
                    connected: socket.connectedUser,
                    user: userRestService.transform(user)
                });
            }).catch(function (err) {
                return response(err);
            });
        });

        let nextIdCursor = 1;
        socket.on('db cursor', /** @function 
                               * @param dbName 
                               * @param modelName 
                               * @param query 
                               * @param options 
                               * @param response */function (dbName, modelName, query, options, response) {
            const idCursor = nextIdCursor++;
            const restService = serverStore.restService(modelName);
            if (!restService) {
                response(null);
                throw new Error('restService missing: ' + modelName);
            }

            query = restService.query(socket.connectedUser, query);
            restService.service.findAll().query(query).cursor().then(function (cursor) {
                if (!cursor) {
                    return response();
                }

                // TODO cursor.isEmpty()
                cursor.count().then(function (count) {
                    // console.log(idCursor, 'count = ', count);
                    if (!count) {
                        cursor.close();
                        return response(null);
                    }

                    const closeCursor = /** @function */function closeCursor() {
                        cursor.close();
                        openCursors.delete(idCursor);
                        timeouts.delete(idCursor);
                        socket.removeAllListeners('db cursor ' + idCursor);
                    };

                    const closeTimeout = setTimeout( /** @function */function () {
                        console.log('cursor closed by timeout ' + idCursor);
                        closeCursor();
                    }, 5 * 60 * 1000);
                    openCursors.set(idCursor, cursor);
                    timeouts.set(idCursor, closeTimeout);

                    // TODO timeouts
                    socket.on('db cursor ' + idCursor, function (instruction, response) {
                        console.log('db cursor ' + idCursor + ' ' + instruction);
                        if (instruction === 'next') {
                            cursor.next().then(function (key) {
                                if (!key) {
                                    return response(null);
                                }

                                return cursor.result().then(function (data) {
                                    response(null, restService.transform(data));
                                });
                            }, function () {
                                response(null);
                            });
                        } else if (instruction === 'forEach') {
                            cursor.forEachResults( /** @function 
                                                   * @param result */function (result) {
                                socket.emit('db cursor forEach ' + idCursor, result && restService.transform(result));
                            }).then( /** @function */function () {
                                response(null);
                            });
                        } else if (instruction === 'close') {
                            clearTimeout(closeTimeout);
                            closeCursor();
                            response(null);
                        } else if (instruction === 'advance') {
                            cursor.advance().then(function () {
                                return response(null);
                            });
                        }
                    });
                    return response(null, idCursor);
                });
            });
        });

        socket.on('db findOne', /** @function 
                                * @param dbName 
                                * @param modelName 
                                * @param query 
                                * @param options 
                                * @param response */function (dbName, modelName, query, options, response) {
            const restService = serverStore.restService(modelName);
            query = restService.query(socket.connectedUser, query);
            restService.service.findOne().query(query).fetch().then(function (vo) {
                response(null, vo && restService.transform(vo.data));
            }).catch(function (err) {
                console.log(err.stack);
                response(err);
            });
        });

        socket.on('db insert', /** @function 
                               * @param dbName 
                               * @param modelName 
                               * @param data 
                               * @param response */function (dbName, modelName, data, response) {
            const restService = serverStore.restService(modelName);
            let vo = restService.service.createNewVO(data);
            vo = restService.prepareInsert(socket.connectedUser, vo);
            restService.service.insert(vo).then(function () {
                response(null, restService.transform(vo.data));
            }).catch(function (err) {
                response(err);
            });
        });

        let nextIdListener = 1;
        socket.on('subscribe', /** @function 
                               * @param dbName 
                               * @param modelName 
                               * @param query 
                               * @param response */function (dbName, modelName, query, response) {
            const idListener = nextIdListener++;
            const restService = serverStore.restService(modelName);
            const listeners = {
                query: restService.query(socket.connectedUser, query),
                inserted: /** @function 
                          * @param vo */function inserted(vo) {
                    console.log('sending insert', idListener);
                    socket.emit(idListener + ' event', { type: 'inserted', data: restService.transform(vo.data) });
                },
                updated: /** @function 
                         * @param vo */function updated(vo) {
                    console.log('sending update', idListener);
                    socket.emit(idListener + ' event', { type: 'updated', data: restService.transform(vo.data) });
                },
                deleted: /** @function 
                         * @param vo */function deleted(vo) {
                    console.log('sending delete', idListener);
                    socket.emit(idListener + ' event', { type: 'deleted', data: restService.transform(vo.data) });
                }
            };
            console.log('scoket subscribing ', listeners);
            restService.service.subscribe(listeners);
            activeListeners.set(idListener, { service: restService.service, listeners });
            socket.on('unsubscribe ' + idListener, /** @function 
                                                   * @param response */function (response) {
                console.log('scoket unsubscribing ', listeners);
                restService.service.unsubscribe(listeners);
                activeListeners.delete(idListener);
                response(null);
            });
            response(null, idListener);
        });
    });
};
//# sourceMappingURL=server.js.map