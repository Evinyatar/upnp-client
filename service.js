var xml2js = require('xml2js').parseString,
    request = require('request'),
    url = require('url'),
    upnpevents = require('./events'),
    EventEmitter = require('events').EventEmitter;


var UA = "UPnP/1.0, UPNPClient/0.0.1";

function _(t) { 
    if(t instanceof Array) return t[0];
    return t._ || t;
};

function sendCommand(service, command, outParams, parameters, cb) {
    var url = service.controlURL;
    var soapAction = service.serviceType + "#" + command;
    var body = "<u:" + command + " xmlns:u=\"" + service.serviceType + "\">";
    for(var x in parameters) {
        body += "<" + x + ">" + parameters[x] + "</" + x + ">";
    }
    body += "</u:" + command + ">";

    var contentType = "text/xml; charset=\"utf-8\"";
    var postData=
        "<s:Envelope s:encodingStyle=\"http://schemas.xmlsoap.org/soap/encoding/\" xmlns:s=\"http://schemas.xmlsoap.org/soap/envelope/\">" +
        "<s:Body>" + body + "</s:Body>" +
        "</s:Envelope>";

    var options = {
        uri: url,
        headers: {
            'Content-Type': contentType,
            'SOAPAction': '"' + soapAction + '"',
            'USER-AGENT': UA
        },
        method: 'POST',
        body: postData
    };

    request(options, function(err, res, body) {
        if(err) {
            cb(err);
        } else if(res.statusCode != 200) {
            if(body) {
                xml2js(body, function(err,upnpReply) {
                    if(err) {
                        cb(err);
                    } else {
                        var fault = upnpReply['s:Envelope']['s:Body'][0]['s:Fault'][0];
                        var error = {
                            error: 'UPnP Error',
                            code: _(fault.detail[0].UPnPError[0].errorCode[0]),
                            message: _(fault.detail[0].UPnPError[0].errorDescription[0])
                        };
                        if(cb!==undefined) {
                            cb(error);
                        }
                    }
                });
            } else {
                cb("Empty response body");
            }
        } else {
            if(cb!==undefined) {
                if(body) {
                    xml2js(body, function(err, bodyObject) {
                        if(!err) {
                            var response = bodyObject['s:Envelope']['s:Body'][0]['u:' + command + 'Response'][0];
                            var results = {};
                            outParams.forEach(function(e) {
                                results[e] = response[e][0];
                            });
                            cb(null, results);
                        } else {
                            cb(err);
                        }
                    });
                } else {
                    cb(null);
                }
            }
        }
    });
}

function Service(options, callback) {
    if(!this instanceof Service) return new Service(options, callback);
    
    function parseDescriptor(descriptor) {
        xml2js(descriptor, function(err, root) {
            if(err) {
                cb(err);
                return;
            }
            
            var listeners = {};
            var evtSubscription = false;
            
            var service = new EventEmitter();
            
            service.controlURL = options.controlURL,
            service.eventSubURL = options.eventSubURL,
            service.serviceType = options.serviceType,
            service.serviceId = options.serviceId
            
            EventEmitter.apply(service);
            
            service.once("newListener", function() {
                evtSubscription = upnpevents(options.eventSubURL, function(err, props) {
                    for(var name in props) {
                        var prop = props[name];
                        service.emit(name, prop[0]);
                    }
                });
            });
            
            var actionList = root.scpd.actionList[0].action;

            actionList.forEach(function(e) {
                var cmd = e.name[0];
                
                var inArgumentList = [];
                var outArgumentList = [];
                
                var arguments = e.argumentList[0].argument;
                arguments.forEach(function(arg) {
                    if(arg.direction[0] == 'in') {
                        inArgumentList.push(arg.name[0]);
                    } else {
                        outArgumentList.push(arg.name[0]);
                    }
                });
                
                service[cmd] = sendCommand.bind(this, service, cmd, outArgumentList);
                service[cmd].argumentList = inArgumentList;
            });
            
            callback(null, service);
        });
    }
    
    if(options.descriptorXml) {
        parseDescriptor(options.descriptorXml);
    } else {
        var req = {
            uri: options.SCPDURL,
            method: 'GET',
            'USER-AGENT': UA
        };
        
        request(req, function(err, res, body) {
            if(err) {
                callback(err);
                return;
            }
            parseDescriptor(body);
        });
    }
}

module.exports = Service;