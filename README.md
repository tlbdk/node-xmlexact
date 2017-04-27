# XmlExact

XmlExact simplifies working with complex XML documents from JavaScript without the XML suck.

##  Introduction

Working with XML documents can be a pain as the legacy of 20 years of over-engineering can quickly be felt. Typical XML 
documents requires you to understand the many overcomplicated standards(XML, XSD, WSDL, XPath, etc.) and the tooling 
that was supposed to help you, bothers you with details that forces you to spend more time on pleasing the XML 
parser/generator instead of actually getting the job of converting your data to and from XML.

XmlExact approach to solving this is by only caring about how the XML will look both as XML and as JavaScript objects. 
Schema validation, XPath queries, namespace specification and other painful stuff is left for other libraries.

To do this XmlExact needs a simple document definition that describes the order, where attributes and namespace 
should be inject and if it should do simple type conversion. This document definition can be written by hand, 
constructed from existing XML, or by using tools that convert WSDL/XSD to the format.

The reason XMLExact was created was to build a SOAP client that can generate SOAP for a number of picky and broken SOAP 
implementations, this work is still in progress, but a POC can be found here: 
[WSDLUtils](https://github.com/tlbdk/wsdl2ts/blob/master/src/wsdlutils.js) 

## Installation

``` bash
$ npm install xml-exact
```

## Features

* Construct complex XML documents from simple JavaScript object
* Keep XML document definition separately from data 
* Ensure element order
* Type conversion between XSD XML and node types
  * array -> array
  * boolean -> boolean
  * decimal, double, float -> number
  * byte, short, int, integer, long -> number
  * negativeInteger, nonNegativeInteger, nonPositiveInteger -> number 
  * unsignedByte, unsignedShort, unsignedInt, unsignedLong -> number
  * base64Binary, hexBinary -> Buffer
* Generate sample JavasScript objects based on the definition

## Limitation

* Only works in NodeJS as it depends on node-expat(libexpat) for XML parsing (pull requests to add other web safe XML 
parses will be very welcome)
* Does not handle cases with namespace collision

## Example of usage

``` JavaScript
var xmlExact = require('xml-exact');

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

// Generate XML and with names spaces, converting types and ensure element order
var xml = xmlExact.toXml(obj, "Envelope", definition);

// Parse xml reconstructing the javascript object with the right types
var parsedObj = xmlExact.fromXml(xml, definition);
```

Output of xml:

``` XML
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope/" xmlns:myns1="http://myns1">
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

## Definition format

``` JavaScript
{
    element$namespace: "soap", // Set the namespace on "element"
    element$attributes: { // Set two attributes on "element" 
        "xmlns:soap": "http://www.w3.org/2003/05/soap-envelope/",
        "customAttibute": "1234",
    },
    element$order: ["subElement1", "subElement2"], // Ensure that subElement1 and subElement2 are first
    element: {
        subElement1$type: "int", // Ensure that subElement1 is treated as a number
        subElemenn2$type: ["string"], // Ensure that subElement2 is treated as a string array
        subElemenn3$type: [], // Ensure that subElement3 is treated as a array
        subElement3: {
            subSubElement$type: "base64Binary" // Ensures that subSubElement is treated as a Buffer
        }
    }
}
```

Supported types:

* [] -> array
* boolean -> boolean
* decimal, double, float -> number
* byte, short, int, integer, long -> number
* negativeInteger, nonNegativeInteger, nonPositiveInteger -> number 
* unsignedByte, unsignedShort, unsignedInt, unsignedLong -> number
* base64Binary, hexBinary -> Buffer


## Functions

### toXml(obj, rootName, [definition, options])

Parameters:

* obj: Javascript object to be converted to XML
* rootName: Name of property in obj that will be used as the root element
* definition: definition used to build XML output
* options: Options when building XML output
  * indentation: Set indentation level for xml output, default is 2
  * convertTypes: Convert types based on the information in the definition, default is true
  * optimizeEmpty: Use self closed tags when property is null, undefined or empty, default is true


### fromXml(xml, [definition, options])

Parameters:

* xml: XML to be convert to JavaScript object
* definition: definition used to build the JavaScript object 
* options: Options when building JavaScript object
  * indentation: Set indentation level for xml output, default is 2
  * convertTypes: Convert types based on the information in the definition, default is true
  * inlineAttributes: Inline attributes in the object by prepending $, default is true
  
### generateDefinition(xml, [type, namespaces]);

* xml: XML document (XML sample or XSD)
* type: "xml", "xsd"
* namespaces: Namespaces to inject root

## Type conversion

``` JavaScript
const definition = {
    complexAll: {
        boolean1$type: "boolean",
        boolean2$type: "boolean",
        float$type: "float",
        int$type: "int",
    },
};

const obj = {
    complexAll: {
        boolean1: true,
        boolean2: false,
        float: 1.1,
        int: 1,
    }
};

// Generate XML
const xml = xmlExact.toXml(obj, "complexAll", definition);

// Parse xml reconstructing the javascript object with the right types
const parsedObj = xmlExact.fromXml(xml, definition);
```

Output of xml:

``` XML
<complexAll>
  <boolean1>true</boolean1>
  <boolean2>false</boolean2>
  <float>1.1</float>
  <int>1</int>
</complexAll>
```

## Generating definitions

The generator does some guess work to generate the definition and might not always find the right types, fx. in case of
base64Binary where it could also be a string.  

``` JavaScript
let generatedDefinition = xmlExact.generateDefinition(sampleXml);
```

Sample XML:

``` XML
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope/" soap:encodingStyle="http://www.w3.org/2003/05/soap-encoding">
  <soap:Header />
  <soap:Body>
    <complexAll>
      <boolean1>true</boolean1>
      <boolean2>true</boolean2>
      <float>1.00</float>
      <int>1124</int>
    </complexAll>
    <simpleArray>
      <item>value</item>
      <item>value</item>
    </simpleArray>
    <complexArray>
      <item>
        <int>1124</int>
        <string>value</string>
      </item>
    </complexArray>
  </soap:Body>
</soap:Envelope>
```

Output of generatedDefinition:

``` JavaScript
{
    Envelope$namespace: "soap",
    Envelope$attributes: {
        "xmlns:soap": "http://www.w3.org/2003/05/soap-envelope/",
        "soap:encodingStyle": "http://www.w3.org/2003/05/soap-encoding"
    },
    Envelope$order: ["Header", "Body"],
    Envelope: {
        Header$namespace: "soap",
        Body$namespace: "soap",
        Body: {
            complexAll: {
                boolean1$type: "boolean",
                boolean2$type: "boolean",
                float$type: "float",
                int$type: "int",
            },
            complexAll$order: ["boolean1", "boolean2", "float", "int"],
            simpleArray: {
                item$type: ["string"]
            },
            complexArray: {
                item: {
                    int$type: "int",
                    string$type: "string",
                },
                item$order: ["int", "string"]
            }
        },
        Body$order: ["complexAll", "simpleArray", "complexArray"]
    }
}
```

## Sample generation

``` JavaScript
const definition = {
    complexAllLength: {
        tickerSymbola$type: "string",
        tickerSymbola$length: [10, 10], // String with minimum and maximum length of 10
        tickerSymbolb$type: ["string", 2, 2], // String array with minimum and maximum length of 2
        tickerSymbolb$length: [1, 1], // String array item with minimum and maximum length of 1
    }
};

const sample = xmlExact.generateSample("complexAllLength", definition);
```

Output of sample:

``` JavaScript
{
    complexAllLength: {
        tickerSymbola: "          ",
        tickerSymbolb: [" ", " "]
    }
};
```