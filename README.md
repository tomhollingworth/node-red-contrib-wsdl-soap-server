# node-red-contrib-wsdl-soap-server
This is a Node-RED library based on [node-soap](https://github.com/vpulim/node-soap) which allows us to easily simulate SOAP servers. The server will be auto-generated given a proper WSDL specification.

It consists of two nodes: 
 - soap-server - which creates the server at a given port and listens for requests
 - soap-response - sends the response back to the client

## Server Node
The server node starts a server at a specific port, and listens for requests defined in the WSDL specification. Therefore, two properties need to be configured to successfully start up the node: 

 - Port - the port on which the soap-server will listen on
 - WSDL Specification - the WSDL specification

The node configuration only accepts a single WSDL file.

Once the server receives a SOAP request, it will automatically extract the information from the request and output them as follows: 

 - msg.payload.params - request parameters
 - msg.payload.headers - request headers
 - msg.payload.fun - function name

## Response Node

The response node will send the response back to the client which requested some data. The node can be configured to either take JSON input (msg.payload) and generate a SOAP envelope output; or take raw XML data on the input and send it as it is to the client.
