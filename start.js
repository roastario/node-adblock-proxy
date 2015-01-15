#!/usr/bin/nodejs


(function () {
    var AdBlockProxy = require('./lib/proxy.js');
    /*
     * GET ROOT FOLDER
     */

    var root = null;
    var port = 8080;
    var tmp = null;
    var host = null;

    var file = __filename.split('/');
    if (file.pop() === 'start.js') {
        root = file.join('/');
    }

    if (root === null) {
        root = __dirname || null;
    }


    /*
     * GET SETTINGS
     */

    if (process.argv instanceof Array) {

        if (process.argv.length === 4) {
            host = process.argv[2];
            port = parseInt(process.argv[3], 10);
        } else if (process.argv.length === 3) {
            console.info('As no host was specified, the default \'localhost\' host will be used');
            host = 'localhost';
            port = parseInt(process.argv[2], 10);
        } else {
            console.error('usage: nodejs start.js [host] <port>');
            process.exit(255);
        }

    }


    var proxy = new AdBlockProxy({
        root: root,
        host: host,
        port: port
    });


    proxy.listen('http', port);
    proxy.listen('socks5', 1080);

})();

