/*
 * POLYFILLS
 */

if (typeof String.prototype.trim !== 'function') {

    String.prototype.trim = function () {
        return this.replace(/^\s+|\s+$/g, '');
    };

}


(function (global) {

    /*
     * PLUGINS
     */

    var _SERVERS = {
        'http': require('./http.js')
//		'socks5': require('./socks5.js')
    };


    /*
     * BLACKLIST
     */

    var _DOMAIN_BLACKLIST = [
        'localhost',
        'localhost.localdomain',
        'broadcasthost'
    ];


    /*
     * CACHE AND STRUCTS
     */

    var _file_cache = {};
    var _host_cache = {};
    var _rule_cache = {};

    var _check_request = function (data) {

        var reqhost = data.host || null;
        var reqhref = data.href || null;


        if (_host_cache[reqhost] === true) {

            return true;

        } else {

            var ruleset = _rule_cache[reqhost] || null;
            if (ruleset !== null) {

                var result = _check_ruleset.call(ruleset, reqhref, false);
                if (result === true) {
                    return true;
                }

            }

        }


        // GC hints
        ruleset = null;
        result = null;
        reqhost = null;
        reqhref = null;


        return false;

    };

    var _check_ruleset = function (url, all) {

// TODO: rulesets not implemented yet
        return false;

        all = all === true;
        url = typeof url === 'string' ? url : null;


        if (url !== null) {

            // 1. All Regular Expressions must match
            if (all === true) {

                var result = true;

                for (var r = 0, rl = this.length; r < rl; r++) {

                    var entry = this[r];
                    if (!entry.match(url)) {
                        result = false;
                        break;
                    }

                }


                return result;


                // 2. Only a single Regular Expression must match
            } else {

                var result = false;

                for (var r = 0, rl = this.length; r < rl; r++) {

                    var entry = this[r];
                    if (entry.match(url)) {
                        result = true;
                        break;
                    }

                }


                return result;

            }

        }


        return false;

    };


    /*
     * HELPERS
     */

    var _fs = require('fs');
    var _path = require('path');

    var _parse_settings = function (data) {

        // Not shared on prototype due to theoretical memleak issues
        var settings = {
            port: 8080,
            root: null,
            host: 'localhost',
            ispublic: false
        };


        if (data instanceof Object) {
            settings.port = typeof data.port === 'number' ? (data.port | 0) : settings.port;
            settings.root = typeof data.root === 'string' ? _path.normalize(data.root) : settings.root;
            settings.host = typeof data.host === 'string' ? data.host : settings;
            settings.ispublic = data.ispublic === true;
        }


        return settings;

    };

    var _parse_file = function (url) {

        var that = this;
        var path = _path.normalize(url);


        _fs.exists(path, function (exists) {

            if (exists === true) {

                // 1. JSON config
                var tmp = path.split('/');
                tmp.pop();
                tmp = tmp.pop();

                if (tmp === 'json.d') {

                    _fs.readFile(path, function (err, raw) {

                        var data = null;
                        if (!err) {

                            try {
                                data = JSON.parse(raw.toString());
                            } catch (e) {
                                data = null;
                                err = true;
                            }

                        }


                        if (err) {
                            console.warn('Invalid JSON file at "' + path + '"');
                        } else {
                            _parse_json.call(that, data);
                        }

                    });

                    // 2. Hosts config
                } else if (tmp === 'hosts.d') {

                    _fs.readFile(path, function (err, raw) {

                        var data = null;
                        if (!err) {
                            data = raw.toString().split('\n');
                        }


                        if (err) {
                            console.warn('Invalid Hosts file at "' + path + '"');
                        } else {
                            _parse_hosts.call(that, data);
                        }

                    });

                } else if (tmp === 'adblockplus.d') {

                    _fs.readFile(path, function (err, raw) {

                        var data = null;
                        if (!err) {
                            data = raw.toString().split('\n');
                        }


                        if (err) {
                            console.warn('Invalid Adblock Plus file at "' + path + '"');
                        } else {
                            _parse_adblockplus.call(that, data);
                        }

                    });

                }


                _fs.stat(path, function (err, info) {

                    if (!err) {
                        _file_cache[path] = info.mtime;
                    }

                });

            } else {
                console.warn('Invalid Config file at "' + path + '"');
            }

        });

    };

    var _parse_adblockplus = function (data) {

        var diff = 0;


        for (var d = 0, dl = data.length; d < dl; d++) {

            var line = data[d].trim();
            if (line.substr(0, 2) === '||') {

                var thirdparty = line.indexOf('^$third-party');
                if (thirdparty !== -1) {

                    var domain = line.substr(2, thirdparty - 2);
                    if (domain.indexOf('*') === -1) {
                        _host_cache[domain] = true;
                        diff++;
                    }

                } else {

//console.log(line);

                }

            }

        }


        if (diff > 0) {
            _print_statistics();
        }

    };

    var _parse_json = function (data) {

        // TODO: Parse JSON config with rulesets
        console.log('PARSING JSON NAO');

    };

    var _parse_hosts = function (data) {

        var diff = 0;


        for (var d = 0, dl = data.length; d < dl; d++) {

            var line = data[d].trim();
            if (line.charAt(0) === '#') {
                continue;
            }


            var index = line.indexOf('#');
            if (index !== -1) {
                line = line.substr(0, index).trim();
            }

            var rule = line.split(/\s/g);
            if (rule.length === 2) {

                // Ignore other hosts for security reasons
                if (
                    rule[0] === '127.0.0.1'
                    || rule[0] === '0.0.0.0'
                ) {

                    var domain = rule[1];
                    if (_DOMAIN_BLACKLIST.indexOf(domain) === -1) {

                        if (_host_cache[domain] === undefined) {
                            _host_cache[domain] = true;
                            diff++;
                        }

                    }

                }

            }

        }


        if (diff > 0) {
            _print_statistics();
        }

    };

    var _print_statistics = function () {

        var hosts = Object.keys(_host_cache).length;
        var rules = Object.keys(_rule_cache).length;

        console.log('Blocked Hosts: ' + hosts + ' / Filter Rules:  ' + rules);

    };


    /*
     * FILESYSTEM STUFF
     */

    var _DIRECTORIES = [
        'adblockplus.d',
        'hosts.d',
        'json.d'
    ];

    var _directory_interval = function () {

        for (var d = 0, dl = _DIRECTORIES.length; d < dl; d++) {

            (function (folder, that) {

                _fs.readdir(folder, function (err, files) {

                    for (var f = 0, fl = files.length; f < fl; f++) {

                        if (files[f] === 'dontdelete.txt') continue;


                        var path = folder + '/' + files[f];

                        var timestamp = 0;
                        if (_file_cache[path] !== undefined) {
                            timestamp = _file_cache[path];
                        }


                        if (timestamp === 0) {

                            _parse_file.call(that, path);

                        } else {

                            if (_fs.statSync(path).mtime > timestamp) {
                                _parse_file.call(that, path);
                            }

                        }

                    }

                });

            })(this.root + '/' + _DIRECTORIES[d], this);

        }

    };


    /*
     * IMPLEMENTATION
     */

    var Proxy = function (data) {

        var settings = _parse_settings(data);

        this.root = settings.root;
        this.host = settings.host;
        this.port = settings.port;
        this.ispublic = settings.ispublic;


        settings = null;
        var that = this;

        setInterval(function () {
            _directory_interval.call(that);
        }, 10000);


        // Initial interval run
        _directory_interval.call(this);

    };


    Proxy.prototype = {

        listen: function (type) {

            type = typeof type === 'string' ? type : null;

            if (type !== null) {
                var _server = _SERVERS[type];
                if (_server !== undefined) {
                    if (this.ispublic === true) {
                        this.host = null;
                    }

                    try {
                       _server.create(this.port, this.host, _check_request, this);
                    } catch (e) {
                        console.error(e);
                        process.exit(254);
                    }
                    return true;
                }

            }


            return false;

        }

    };


    /*
     * LIBRARY INTEGRATION
     */

    module.exports = Proxy;

})(this);
