module.exports = function (RED) {

    const http = require("http");
    const soap = require("soap");
    const convert = require("xml-js");
    const url = require("url");

    function parseService(service, bindings, node) {
        const serviceName = service["_attributes"]["name"];
        const serviceUrl =  service["port"]["soap:address"]["_attributes"]["location"];
        const portName = service["port"]["_attributes"]["name"];
        const bindingName = service["port"]["_attributes"]["binding"].replace("tns:", "");
        var portFunctions = []
        if (Array.isArray(bindings)) {
            for (var i = 0; i < bindings.length; i++) {
                if (bindings[i]["_attributes"]["name"].replace("tns:","") == bindingName) {
                    portFunctions = parseBinding(bindings[i])
                }
            }
        } else {
            portFunctions = parseBinding(bindings)
        }

        var parsedService = {
            [serviceName]: {
                "serviceUrl": serviceUrl,
                [portName]: {}
            }
        };

        for (var i = 0; i < portFunctions.length; i++) {
            const functionName = portFunctions[i];
            parsedService[serviceName][portName][functionName] = function(args, callback, headers, req, res, server) {
                node.send({
                    payload: {
                        params: args,
                        headers: headers,
                        req: req,
                        fun: functionName,
                    },
                    _soap_server_soapResponseCallback: callback,
                    _soap_server_reference: server,
                    res: res
                });
            };
        }

        return parsedService
    }

    function parseBinding(binding) {
        var portFunctions = []
        if (Array.isArray(binding["operation"])) {
            for (var i = 0; i < binding["operation"].length; i++) {
                portFunctions.push(binding["operation"][i]["_attributes"]["name"])
            }
        } else {
            portFunctions.push(binding["operation"]["_attributes"]["name"])
        }
        return portFunctions;
    }


    function server(config) {
        RED.nodes.createNode(this, config);
        var node = this;
        var {
            port,
            wsdl
        } = config


        var parsedXml = JSON.parse(convert.xml2json(wsdl, {
            compact: true,
            spaces: 4
        }));

        parsedXml = parsedXml["definitions"];
        var services = {}

        if (Array.isArray(parsedXml["service"])) {
            for (var i = 0; i < parsedXml["service"].length; i++) {
                var service = parseService(parsedXml["service"][i], parsedXml["binding"], node);
                for(const [key, value] of Object.entries(service)){
                    services[key] = value;
                }
            }

        } else {
            var service = parseService(parsedXml["service"], parsedXml["binding"], node);
            for(const [key, value] of Object.entries(service)){
                services[key] = value;
            }
        }

        console.log(JSON.stringify(services));

        try {

            const server = http.createServer(function (request, response) {
                response.end("404: Not Found" + request.url)
            });

            server.listen(port);

            for(const [key, value] of Object.entries(services)){
                var path = url.parse(value["serviceUrl"]).pathname.replace(/\/$/, '');
            soap.listen(server, path, services, wsdl, function () {
                node.status({
                    fill: "green",
                    shape: "dot",
                    text: "Server running..."
                });
            });
            }

            node.on("close", function (callback) {
                node.status({
                    fill: "yellow",
                    shape: "dot",
                    text: "Stopping"
                });
                server.close(callback);
            });


        } catch (err) {
            node.status({
                fill: "red",
                shape: "dot",
                text: "Error"
            });
            node.error(err.message);
        }

    }

    RED.nodes.registerType("soap-server", server);

}
