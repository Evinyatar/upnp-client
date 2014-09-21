var testCase = require("nodeunit").testCase;
var fs = require('fs');
var upnp = require('../service');

module.exports = {
    "TestParsing": function(test) {
        var content = fs.readFileSync('./test/descriptor.xml');
        upnp({
            descriptorXml: content,
            controlURL: '/dmr/control_1',
            eventSubURL: '/dmr/event_1'
        }, function(err, client) {
            test.ifError(err);
            test.ok(client.SetAVTransportURI, 'SetAVTransportURI');
            test.ok(client.GetMediaInfo, 'GetMediaInfo');
            test.ok(client.GetTransportInfo, 'GetTransportInfo');
            test.ok(client.GetPositionInfo, 'GetPositionInfo');
            test.ok(client.GetDeviceCapabilities, 'GetDeviceCapabilities');
            test.ok(client.GetTransportSettings, 'GetTransportSettings');
            test.ok(client.Stop, 'Stop');
            test.ok(client.Play, 'Play');
            test.ok(client.Pause, 'Pause');
            test.ok(client.Seek, 'Seek');
            test.ok(client.Next, 'Next');
            test.ok(client.Previous, 'Previous');
            test.ok(client.GetCurrentTransportActions, 'GetCurrentTransportActions');
            test.ok(client.X_DLNA_GetBytePositionInfo, 'X_DLNA_GetBytePositionInfo');
            test.ifError(client.SomethingNonExistentForCompletenessSake, 'SomethingNonExistentForCompletenessSake');
            test.done();
        });
    }
};