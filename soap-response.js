module.exports = function (RED) {
    function SOAPResponse(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        node.on("input", function (msg) {
            const callback = msg["_soap_server_soapResponseCallback"];
            const server = msg["_soap_server_reference"];
            const res = msg["res"];
            if (!config.convert) {
                var result = server._envelope(msg.payload, this.headers, this.includeTimestamp);
                server._sendHttpResponse(res, 200, result);
            } else {
                if (callback == null) {
                    return;
                }
                callback(msg.payload);
            }
        });
    }

    RED.nodes.registerType("soap-response", SOAPResponse);
};