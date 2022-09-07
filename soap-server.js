module.exports = function (RED) {

    const http = require("http");
    const soap = require("soap");
    const convert = require("xml-js");

    function parseService(service, bindings, node) {
        const serviceName = service["_attributes"]["name"];
        const portName = service["wsdl:port"]["_attributes"]["name"];
        const bindingName = service["wsdl:port"]["_attributes"]["binding"];
        var portFunctions = []
        if (Array.isArray(bindings)) {
            for (var i = 0; i < bindings.length; i++) {
                if (bindings[i]["_attributes"]["name"] == bindingName) {
                    portFunctions = parseBinding(bindings[i])
                }
            }
        } else {
            portFunctions = parseBinding(bindings)
        }

        var parsedService = {
            [serviceName]: {
                [portName]: {}
            }
        };

        for (var i = 0; i < portFunctions.length; i++) {
            const functionName = portFunctions[i];
            parsedService[serviceName][portName][functionName] = function(args, callback, headers, req) {
                node.send({
                    payload: {
                        params: args,
                        headers: headers,
                        req: req,
                        fun: functionName
                    },
                    _soap_server_soapResponseCallback: callback,
                });
                return {
                    name: args.name
                };
            };
        }

        return parsedService
    }

    function parseBinding(binding) {
        var portFunctions = []
        if (Array.isArray(binding["wsdl:operation"])) {
            for (var i = 0; i < binding["wsdl:operation"].length; i++) {
                portFunctions.push(binding["wsdl:operation"][i]["_attributes"]["name"])
            }
        } else {
            portFunctions.push(binding["wsdl:operation"]["_attributes"]["name"])
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

        parsedXml = parsedXml["wsdl:definitions"];
        var services = {}

        if (Array.isArray(parsedXml["wsdl:service"])) {
            for (var i = 0; i < parsedXml["wsdl:service"].length; i++) {
                var service = parseService(parsedXml["wsdl:service"][i], parsedXml["wsdl:binding"], node);
                for(const [key, value] of Object.entries(service)){
                    services[key] = value;
                }
            }

        } else {
            var service = parseService(parsedXml["wsdl:service"], parsedXml["wsdl:binding"], node);
            for(const [key, value] of Object.entries(service)){
                services[key] = value;
            }
        }

        try {

            const server = http.createServer(function (request, response) {
                response.end("404: Not Found" + request.url)
            });

            server.listen(port);

            soap.listen(server, "/wsdl", services, wsdl, function () {
                node.status({
                    fill: "green",
                    shape: "dot",
                    text: "Server running..."
                });
            });

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