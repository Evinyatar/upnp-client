var url = require('url');
var xml2js = require('xml2js').parseString;
var request = require('request');

var sequence = 1;

var config;

function getPublicAddress() {
    var os = require('os');
    var interfaces = os.networkInterfaces();
    for(var name in interfaces) {
        var ni = interfaces[name].filter(function(e) {
            return e.internal === false && e.family === 'IPv4';
        });
        if(ni.length) {
            return ni[0].address;
        }
    }
    
    throw Error('Unable to determine usable IP address for event listening');
}

function init() {
    var http = require('http');
    var address = getPublicAddress();
    var routes = {};
    
    var server = http.createServer(function(req, res) {
        if(routes[req.url]) {
            routes[req.url](req, res);
        } else {
            console.warn("Event request unknown for unknown target: " + req.url);
            res.statusCode = 404;
            res.end();
        }
    }).listen(0);
    
    config = {
        route: {
            use: function(uri, callback) {
                routes[uri] = callback;
            }
        },
        
        routeUri: 'http://' + address + ':' + server.address().port
    };
}

function subscribe(eventUrl, callback) {
    var callbackUri = "/upnpevt/" + (sequence++) + "/"; 
    var self = this;
    
    if(!config) {
        init();
    }

    config.route.use(callbackUri, function(req,res) {
        var data = '';

        res.status ? res.status(100) : res.statusCode = 100;

        req.on('data', function(chunk) {
            data += chunk;
        });
        req.on('end', function() {
            xml2js(data, function(err, evt) {
                for(var evtType in evt) {
                    var subEvt = evt[evtType];
                    switch(evtType) {
                    case 'e:propertyset':
                        var props = subEvt['e:property'];
                        props.forEach(function(e) {
                            callback(false, e);
                        });
                    }
                }
            });
            
            res.status ? res.status(200) : res.statusCode = 200;
            res.end();
        });
    });

    callbackUri = url.resolve(config.routeUri, callbackUri);

    var options = {
        method: "SUBSCRIBE",
        url: eventUrl,
        headers: {
            CALLBACK: "<" + callbackUri + ">",
            NT: "upnp:event",
            TIMEOUT: "Second-300"
        }
    };

    request(options, function(err) {
        callback(err);
    });
}

module.exports = subscribe;