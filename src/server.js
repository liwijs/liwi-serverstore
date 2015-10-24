exports.initialize = function(io, serverStore) {
    io.on('connection', function(socket) {
        let openCursors = new Map;
        let timeouts = new Map;
        let activeListeners = new Map;

        socket.on('disconnect', function() {
            openCursors.forEach(cursor => cursor.close());
            openCursors.clear();
            openCursors = null;

            timeouts.forEach(timeout => clearTimeout(timeout));
            timeouts.clear();
            timeouts = null;

            activeListeners.forEach(activeListener => {
                activeListener.service.unsubscribe(activeListener.listeners);
            });

            activeListeners.clear();
            activeListeners = null;
        });

        socket.on('connectedUser', function(response) {
            const userRestService = serverStore.restService('user');
            userRestService.findConnected(socket.connectedUser).then((user) => {
                if (!user) {
                    return response(null);
                }

                response(null, {
                    connected: socket.connectedUser,
                    user: userRestService.transform(user),
                });
            }).catch((err) => response(err));
        });

        let nextIdCursor = 1;
        socket.on('db cursor', function(dbName, modelName, query, options, response) {
            const idCursor = nextIdCursor++;
            const restService = serverStore.restService(modelName);
            if (!restService) {
                response(null);
                throw new Error('restService missing: ' + modelName);
            }

            query = restService.query(socket.connectedUser, query);
            restService.service.findAll().query(query).cursor().then((cursor) => {
                if (!cursor) {
                    return response();
                }

                // TODO cursor.isEmpty()
                cursor.count().then((count) => {
                    // console.log(idCursor, 'count = ', count);
                    if (!count) {
                        cursor.close();
                        return response(null);
                    }

                    const closeCursor = function() {
                        cursor.close();
                        openCursors.delete(idCursor);
                        timeouts.delete(idCursor);
                        socket.removeAllListeners('db cursor ' + idCursor);
                    };

                    const closeTimeout = setTimeout(function() {
                        console.log('cursor closed by timeout ' + idCursor);
                        closeCursor();
                    }, 5 * 60 * 1000);
                    openCursors.set(idCursor, cursor);
                    timeouts.set(idCursor, closeTimeout);

                    // TODO timeouts
                    socket.on('db cursor ' + idCursor, (instruction, response) => {
                        console.log('db cursor ' + idCursor + ' ' + instruction);
                        if (instruction === 'next') {
                            cursor.next().then((key) => {
                                if (!key) {
                                    return response(null);
                                }

                                return cursor.result().then((data) => {
                                    response(null, restService.transform(data));
                                });
                            }, () => {
                                response(null);
                            });
                        } else if (instruction === 'forEach') {
                            cursor.forEachResults(function(result) {
                                socket.emit('db cursor forEach ' + idCursor, result && restService.transform(result));
                            }).then(function() {
                                response(null);
                            });
                        } else if (instruction === 'close') {
                            clearTimeout(closeTimeout);
                            closeCursor();
                            response(null);
                        } else if (instruction === 'advance') {
                            cursor.advance().then(() => response(null));
                        }
                    });
                    return response(null, idCursor);
                });
            });
        });

        socket.on('db findOne', function(dbName, modelName, query, options, response) {
            const restService = serverStore.restService(modelName);
            query = restService.query(socket.connectedUser, query);
            restService.service.findOne().query(query).fetch().then((vo) => {
                response(null, vo && restService.transform(vo.data));
            }).catch((err) => {
                console.log(err.stack);
                response(err);
            });
        });

        socket.on('db insert', function(dbName, modelName, data, response) {
            const restService = serverStore.restService(modelName);
            let vo = restService.service.createNewVO(data);
            vo = restService.prepareInsert(socket.connectedUser, vo);
            restService.service.insert(vo).then(() => {
                response(null, restService.transform(vo.data));
            }).catch((err) => {
                response(err);
            });
        });

        let nextIdListener = 1;
        socket.on('subscribe', function(dbName, modelName, query, response) {
            const idListener = nextIdListener++;
            const restService = serverStore.restService(modelName);
            const listeners = {
                query: restService.query(socket.connectedUser, query),
                inserted: function(vo) {
                    console.log('sending insert', idListener);
                    socket.emit(idListener + ' event', { type: 'inserted', data: restService.transform(vo.data) });
                },
                updated: function(vo) {
                    console.log('sending update', idListener);
                    socket.emit(idListener + ' event', { type: 'updated', data: restService.transform(vo.data) });
                },
                deleted: function(vo) {
                    console.log('sending delete', idListener);
                    socket.emit(idListener + ' event', { type: 'deleted', data: restService.transform(vo.data) });
                },
            };
            console.log('scoket subscribing ', listeners);
            restService.service.subscribe(listeners);
            activeListeners.set(idListener, { service: restService.service, listeners });
            socket.on('unsubscribe ' + idListener, function(response) {
                console.log('scoket unsubscribing ', listeners);
                restService.service.unsubscribe(listeners);
                activeListeners.delete(idListener);
                response(null);
            });
            response(null, idListener);
        });
    });
};
