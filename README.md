upnp-client
-----------

Very basic node.js framework for communicating with UPnP devices; allows to send commands and receive events.
Use ssdp-client for device discovery.

Usage:

    var device = require("./device");

    device({descriptorUrl: 'http://192.168.1.30:55000/dmr/ddd.xml'}, function(err, dev) {
        var renderingControl = dev.services['urn:upnp-org:serviceId:RenderingControl'];

        renderingControl.X_GetAudioList({InstanceID:0}, function(err, body) {
            console.log(body);
        });

        renderingControl.on("LastChange", function(event) {
            console.log(event);
        });
    });

