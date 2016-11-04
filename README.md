# XmlExact

XmlExact simplifies creating complex XML documents from JavaScript objects without the XML suck.

## Installation

``` bash
$ npm install xml-exact
```

## Example of usage

``` JavaScript
var XmlExact = require('xml-exact');

var definition = {
  Envelope$namespace: "soap",
  Envelope$attributes: {
    "xmlns:myns1": "http://myns1",
    "xmlns:soap": "http://www.w3.org/2003/05/soap-envelope/",
  },
  Envelope$order: ["Header", "Body"],
  Envelope: {
    Header$namespace: "soap",
    Body$namespace: "soap",
    Body: {
      value$namespace: "myns1",
      value$type: "int",
      values$attributes: {
        "xmlns:stuff": "http://www.w3.org/2003/05/soap-encoding"
      },
      values: {
        value$namespace: "stuff",
        value$type: [],
      },
    }
  }
};

var soapXml = new XmlExact(definition);

var obj = {
  Envelope: {
    Header: {},
    Body: {
      value: 10,
      values: {
        value: ["a", "b", "c"]
      }
    }
  }
};

var xml = soapXml.toXML(obj);
```

Output result:

``` XML
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope/" xmlns:myns1="http://myns1">',
  <soap:Header />
  <soap:Body>
    <myns1:value>10</myns1:value>
    <values xmlns:stuff="http://www.w3.org/2003/05/soap-encoding">
      <stuff:value>a</stuff:value>
      <stuff:value>b</stuff:value>
      <stuff:value>c</stuff:value>
    </values>
  </soap:Body>
</soap:Envelope>
```
