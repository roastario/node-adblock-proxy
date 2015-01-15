(function (global) {

    /*
     * CACHE AND STRUCTS
     */

    var _cache = {};


    /*
     * HELPERS
     */

    var _http = require('http');
    var _url = require('url');


    /*
     * LIBRARY INTEGRATION
     */
    module.exports = {
        create: function (port, host, callback, scope) {

            host = typeof host === 'string' ? host : null;
            port = typeof port === 'number' ? (port | 0) : null;
            callback = typeof callback === 'function' ? callback : function () {
                return false;
            };
            scope = typeof scope !== 'undefined' ? scope : this;


            if (port !== null) {

                var server = _http.createServer(function (request, response) {

                    var options = _url.parse(request.url);

                    var data = {
                        host: options.host,
                        href: options.href
                    };


                    var isblocked = callback.call(scope, data);
                    if (isblocked === true) {

                        var header = {
                            'Content-Length': 31
                        };

                        response.writeHead(410, header);
                        response.write('Blocked by NodeJS AdBlock Proxy');
                        response.end();

                    } else {

                        request.pause();

                        var connector = _http.request(options, function (targetresponse) {

                            targetresponse.pause();
                            response.writeHead(targetresponse.statusCode, targetresponse.headers);
                            targetresponse.pipe(response);
                            targetresponse.resume();

                        });

                        // TODO: Evaluate if a timeout of 500ms is fair enough
                        connector.on('socket', function (socket) {
                            socket.setTimeout(500);
                        });

                        connector.on('error', function (err) {

                            var header = {
                                'Content-Length': 15
                            };

                            response.writeHead(504, header);
                            response.write('Gateway Timeout');
                            response.end();

                        });

                        connector.on('timeout', function () {

                            var header = {
                                'Content-Length': 15
                            };

                            response.writeHead(504, header);
                            response.write('Gateway Timeout');
                            response.end();

                        });

                        request.pipe(connector);
                        request.resume();

                    }


                    // GC hints
                    options = null;
                    data = null;
                    isblocked = null;
                    connector = null;

                });

                server.on('error', function (err) {
                    if (err.code === 'EADDRNOTAVAIL') {
                        console.error('Could not bind to: ' + host + ':' + port + ' as no host address matching was found. Check your configuration');
                        process.exit(253);
                    } else if (err.code === 'EADDRINUSE') {
                        console.error('Could not bind to: ' + host + ':' + port + ' as another application is listening on this port. Check your configuration');
                        process.exit(253);
                    } else if (err.code === 'EACCES') {
                        console.error('Could not bind to port: ' + port + ' as current user has insufficient privileges. Note it is not recommended to run as a Super User');
                        process.exit(253);
                    }

                    else {
                        console.error('Unknown error occurred ' + err);
                    }
                });

                server.on('listening', function () {
                    console.info("Successfully started a HTTP proxy on " + host + ':' + port);
                });


                if (host !== null) {
                    server.listen(port, host);
                } else {
                    server.listen(port);
                }

            }

        },

        get: function (port) {
            return _cache[port] || null;
        }

    };

})(this);

