var xml2js = require('xml2js').parseString,
    request = require('request');
var service = require('./service');
var async = require('async');
var url = require('url');

var UA = "UPnP/1.0, UPNPClient/0.0.1";

function _(t) {
    if(t instanceof Array) return t[0];
    return t;
};

function Device(options, callback) {
    function parseDescriptor(descriptor) {
        xml2js(descriptor, function(err, root) {
            if(err) {
                cb(err);
                return;
            }
            
            var descriptor = root.root.device[0];
            
            var device = {
                deviceType: _(descriptor.deviceType),
                friendlyName: _(descriptor.friendlyName),
                manufacturer: _(descriptor.manufacturer),
                modelName: _(descriptor.modelName),
                modelNumber: _(descriptor.modelNumber),
                UDN: _(descriptor.UDN)
            };
            
            var iconList = descriptor.iconList[0].icon;
            device.icons = iconList.map(function(e) {
                return {
                    mimetype: _(e.mimetype),
                    width: _(e.width),
                    height: _(e.height),
                    depth: _(e.depth),
                    url: _(e.url)
                };
            });

            var serviceList = descriptor.serviceList[0].service;
            
            async.map(serviceList, function(s, cb) { 
                s.descriptorURL = options.descriptorUrl;
                service({
                    SCPDURL: url.resolve(options.descriptorUrl, _(s.SCPDURL)),
                    controlURL: url.resolve(options.descriptorUrl, _(s.controlURL)),
                    eventSubURL: url.resolve(options.descriptorUrl, _(s.eventSubURL)),
                    serviceId: _(s.serviceId),
                    serviceType: _(s.serviceType)
                }, cb);
            }, function(err, services) {
                if(err) {
                    callback(err);
                    return;
                }
                
                services.forEach(function(e) {
                    services[e.serviceId] = e;
                });
                
                device.services = services;
                
                callback(null, device);
            });
        });
    }
    
    if(options.descriptorXml || options.LOCATION) {
        parseDescriptor(options.descriptorXml || options.LOCATION);
    } else {
        var req = {
            uri: options.descriptorUrl,
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

module.exports = Device;