"use strict";

const expat = require('node-expat');

const defaultToXmlOptions = {
    indentation: 2,
    optimizeEmpty: true,
    convertTypes: true,
    validation: false
};

const defaultFromXmlOptions = {
    indentation: 2,
    inlineAttributes: true,
    convertTypes: true
};

function toXml(obj, rootName, definition = {}, options = {}) {
    let args = Object.assign({}, defaultToXmlOptions, options);
    return _toXml(obj, definition, rootName, args.indentation, args.optimizeEmpty, args.convertTypes);
}

function fromXml(xml, definition = {}, options = {}) {
    let args = Object.assign({}, defaultFromXmlOptions, options);
    return _fromXml(xml, definition, args.inlineAttributes, args.convertTypes);
}

function generateSample(rootName, definition) {
    return {
        [rootName]: _generateSample(definition[rootName])
    }
}

function generateDefinition(xmlOrObj, type = "xml", namespaces = {}) {
    if(type === "xml") {
        let obj = typeof xmlOrObj === "string" ? _fromXml(xmlOrObj, null, false, false) : xmlOrObj;
        return _generateDefinitionXml(obj);

    } else if(type === "xsd") {
        let obj = typeof xmlOrObj === "string" ? _fromXml(xmlOrObj, {
            "schema": {
                "element$type": [],
                "simpleType$type": [],
                "complexType$type": [],
            }
        }, true, false).schema : xmlOrObj;
        return _generateDefinitionXsd(obj, namespaces);

    } else {
        throw new Error("Unknown type '" + type + "'");
    }
}

class Parser {
    constructor(definition, options = {}) {
        this._definition = definition;
        this._options = options;
    }

    toXml(obj, rootName) {
        return toXml(obj, rootName, this._definition, this._options);
    }

    fromXml(xml) {
        return fromXml(xml, this._definition, this._options);
    }

    generateSample(rootName) {
        return generateSample(this._definition, this._options);
    }

    generateDefinition(xml, type = "xml", namespaces = {}) {
        return generateDefinition(xml, type, namespaces);
    }
}

function _toXml (obj, definition, parentName, indentation, optimizeEmpty, convertTypes, level = 0) {
    definition = definition ? definition : {};

    let result = "";
    let namespace = "";
    let nsOffset = parentName.indexOf(':');
    if(nsOffset > - 1) {
        namespace = parentName.substr(0, nsOffset) + ":";
        parentName = parentName.substr(nsOffset + 1);

    } else if(definition[parentName + "$namespace"]) {
        namespace = definition[parentName + "$namespace"] + ":";
    }
    let order = obj[parentName + "$order"] || definition[parentName + "$order"];
    let type = obj[parentName + "$type"] || definition[parentName + "$type"];

    let attributes = {};
    let definitionAttributes = (definition[parentName + "$attributes"] || {});
    Object.keys(definitionAttributes).forEach((key) => {
        if(key.indexOf("$") === -1) {
            let attributeValue = definitionAttributes[key];
            if(convertTypes) {
                let attributeType = definitionAttributes[key + "$type"];
                if(attributeType) {
                    attributeValue = _convertToXsdType(attributeType, attributeValue);
                }
            }
            attributes[key] = attributeValue;
        }
    });

    let whitespace = " ".repeat(level * indentation);

    if(level === 0) {
        // Go into first level
        obj = obj[parentName];
    }

    if(obj === undefined || obj === null) {
        // TODO: Handle null types
        return result;
    }

    if(convertTypes) {
        obj = _convertToXsdType(type, obj);
    }

    if(Array.isArray(obj)) {
        obj.forEach(function(value) {
            result += _toXml(value, definition, namespace + parentName, indentation, optimizeEmpty, convertTypes, level);
        });

    } else if(typeof obj === "object") {
        let keys = Object.getOwnPropertyNames(obj);
        if(order) {
            keys = keys.sort((a, b) => {
                let aOffset = order.indexOf(a);
                let bOffset = order.indexOf(b);
                if(aOffset == -1 && bOffset > 0) {
                    return 1;
                }
                if(bOffset == -1 && aOffset > 0) {
                    return -1;
                }
                return aOffset - bOffset;
            });
        }

        let subResult = "";
        keys.forEach(function(key) {
            if(key === "$") { // TODO: Support data before and after
                let objValue = obj[key];
                if(convertTypes) {
                    let attributeType = definition[parentName + "$type"];
                    if (attributeType) {
                        objValue = _convertToXsdType(attributeType, objValue);
                    }
                }
                subResult += objValue;

            } else if(key === "namespace$") {
                namespace = obj[key] + ":";

            } else if(key.indexOf("$") == 0) {
                let attributeValue = obj[key];
                if(convertTypes) {
                    let attributeType = definitionAttributes[key.substr(1) + "$type"];
                    if(attributeType) {
                        attributeValue = _convertToXsdType(attributeType, attributeValue);
                    }
                }
                attributes[key.substr(1)] = attributeValue;

            } else if(key.indexOf("$") > 0) {
                // Skip definition information such as order

            } else {
                subResult += _toXml(obj[key], definition[parentName], key, indentation, optimizeEmpty, convertTypes, level + 1);
            }
        });

        // Generate start and end tag
        result += whitespace + "<" + namespace +  parentName;
        Object.keys(attributes).forEach((key) => {
            result += " " + key + '="' + escapeValue(attributes[key]) + '"';
        });

        if(!obj["$"] && subResult === "" && optimizeEmpty) {
            result += " />\n";

        } else {
            result += obj["$"] ? (">" + subResult) : (">\n" + subResult + whitespace);
            result += "</" + namespace + parentName + ">" + (level > 0 ? "\n" : "");
        }

    } else {
        result += whitespace + "<" + namespace +  parentName;
        Object.getOwnPropertyNames(attributes).forEach(function(key){
            result += " " + key + '="' + attributes[key] + '"';
        });

        if(obj === "" && optimizeEmpty) {
            result += " />\n";

       } else if(convertTypes && type === 'xml') {
            result += ">\n"
                + whitespace.repeat(2) + obj.replace(/\n/g, "\n" + whitespace.repeat(2)) + "\n"
                + whitespace + "</" + namespace + parentName + ">\n";

        } else {
            result += ">" + escapeValue(obj) + "</" + namespace + parentName + ">\n";
        }
    }

    return result;
}

function escapeValue(value) {
    // https://stackoverflow.com/questions/1091945/what-characters-do-i-need-to-escape-in-xml-documents/1091953
    if(typeof value === 'string'){
        return value.replace(/((?:&(?!(?:apos|quot|[gl]t|amp);))|(?:^<!\[CDATA\[.+?\]\]>)|[<>'"])/g, function(match, p1) {
            switch(p1) {
                case '>': return '&gt;';
                case '<': return '&lt;';
                case "'": return '&apos;';
                case '"': return '&quot;';
                case '&': return '&amp;';
                default: return p1;
            }
        });

    } else {
        return value;
    }
}

function _fromXml (xml, objectDefinition, inlineAttributes, convertTypes) {
    const definitions = [objectDefinition || {}];

    const parser = new expat.Parser('UTF-8');
    let result = {};
    let currentValue = "";
    let currentObject = result;
    let currentType = "";
    let objects = [];
    let names = [];

    let orders = [];
    let namespaces = {}; // { nsAlias: url }
    let definitionNamespaces = {}; // { nsAlias: url }
    let definitionNamespaceUrls = {}; // { url: nsAlias }

    parser.on('startElement', function(name, attributes) {
        // Parse namespace
        let nsAlias = name.split(":");
        if(nsAlias.length > 1) {
            name = nsAlias[1];
            nsAlias = nsAlias[0];
        } else {
            nsAlias = undefined;
        }

        const definition = definitions[definitions.length - 1];
        let definitionAttributes = definition[name + "$attributes"] || {};

        currentType = definition[name + "$type"];
        let nextObject = {};
        currentValue = ""; // TODO: Create $t value on object if this has data

        // TODO: Simplify namespace handling by only working with urls

        // Extract namespaces for alias lookup
        Object.keys(attributes).forEach(function(key) {
            let ns = key.match(/^xmlns:(.+)$/);
            if (ns) {
                namespaces[ns[1]] = attributes[key];
            }
        });
        Object.keys(definitionAttributes).forEach(function(key) {
            let ns = key.match(/^xmlns:(.+)$/);
            if (ns) {
                definitionNamespaceUrls[definitionAttributes[key]] = ns[1];
                definitionNamespaces[ns[1]] = definitionAttributes[key];
            }
        });

        let nsUrl = namespaces[nsAlias];
        let definitionNsUrl = definitionNamespaces[definition[name + "$namespace"]];

        if(nsAlias && nsUrl != definitionNsUrl) {
            if(inlineAttributes) {
                nextObject["namespace" + "$"] = nsAlias;

            } else {
                currentObject[name + "$namespace"] = nsAlias;
            }
        }

        // Filter attributes so we only include ones not in definition
        Object.keys(attributes).forEach((key) => {
            let value = attributes[key];
            let definitionValue = "";
            let nameNsAlias = key.split(":");
            if(nameNsAlias.length > 1) {
                if(nameNsAlias[0] === "xmlns") {
                    let definitionNsAlias = definitionNamespaceUrls[value];
                    if(definitionNsAlias) {
                        definitionValue = value;
                    }
                } else {
                    let nsUrl = namespaces[nameNsAlias[0]];
                    let definitionNsAlias = definitionNamespaceUrls[nsUrl];
                    if(definitionNsAlias) {
                        definitionValue = definitionAttributes[definitionNsAlias + ":" + nameNsAlias[1]];
                    }
                }

            } else {
                definitionValue = definitionAttributes[key];
            }

            if(value === definitionValue) {
                delete attributes[key];

            } else {
                let attributeType = definitionAttributes[key + "$type"];
                if(attributeType){
                    attributes[key] = _convertFromXsdType(attributeType, attributes[key]);
                }
            }
        });

        // Handle attributes
        if(Object.keys(attributes).length > 0) {
            if(inlineAttributes) {
                Object.keys(attributes).forEach(function(key){
                    nextObject["$" + key] = attributes[key];
                });

            } else {
                if(currentObject.hasOwnProperty(name + "$attributes")) {
                    if(Array.isArray(currentObject[name + "$attributes"])) {
                        currentObject[name + "$attributes"].push(attributes);

                    } else {
                        // Convert to array
                        currentObject[name + "$attributes"] = [currentObject[name + "$attributes"], attributes];
                    }

                } else {
                    if(Array.isArray(currentType)) {
                        currentObject[name + "$attributes"] = [attributes];

                    } else {
                        currentObject[name + "$attributes"] = attributes;
                    }
                }
            }
        }

        // Handle tag
        if(currentObject.hasOwnProperty(name)) {
            if(Array.isArray(currentObject[name])) {
                currentObject[name].push(nextObject);

            } else {
                // Convert to array
                currentObject[name] = [currentObject[name], nextObject];
            }

        } else {
            // Check definition to see if we have a type defined
            if(Array.isArray(currentType)) {
                currentObject[name] = [nextObject];

            } else {
                currentObject[name] = nextObject;
            }
        }

        // Save order
        if(orders.length <= names.length) {
            orders.push([name]);

        } else if(!Array.isArray(currentObject[name])) {
           orders[names.length].push(name);
        }

        names.push(name);
        objects.push(currentObject);
        definitions.push(definition[name] || {});
        currentObject = nextObject;
    });

    parser.on('text', function(data) {
        currentValue += data.trim();
    });

    parser.on('endElement', function(name){
        let ns = name.split(":");
        if(ns.length > 1) {
            name = ns[1];
            ns = ns[0];
        }

        if(objects.length > 0) {
            currentObject = objects.pop();
            definitions.pop();

            if(names.length < orders.length) {
                let order = orders.pop();
                if(order.length > 1) {
                    let definedOrder = definitions[definitions.length - 1][name + "$order"];
                    if(!_compareArray(definedOrder, order)) {
                        currentObject[name + "$order"] = order;
                    }
                }
            }
            names.pop();

            if(Array.isArray(currentObject[name])) {
                if(Object.getOwnPropertyNames(currentObject[name][currentObject[name].length -1]).length === 0) {
                    currentObject[name][currentObject[name].length -1] = currentValue;

                } else {
                    currentObject[name][currentObject[name].length -1].$ = currentValue;
                    // TODO: Save "<tag>text<subtag>" type text
                }

            } else if(typeof currentObject[name] === "object") {
                if(Object.getOwnPropertyNames(currentObject[name]).length === 0) { // Move to utility function
                    if(convertTypes) {
                        currentObject[name] = _convertFromXsdType(currentType, currentValue);

                    } else {
                        currentObject[name] = currentValue; // TODO: Handle inline attributes
                    }

                } else if(currentValue != '') {
                    if(convertTypes) {
                        currentObject[name].$ = _convertFromXsdType(currentType, currentValue);
                    } else {
                        currentObject[name].$ = currentValue;
                    }
                    // TODO: Save "<tag>text<subtag>" type text
                }
            }
        } else {
            console.log("No objects in objects");
        }

        currentValue = "";
    });

    if (!parser.parse(xml)) {
        throw new Error('There are errors in your xml file: ' + parser.getError());
    }

    return result;
}

function _convertToXsdType(type, value) {
    if(typeof value === "object" && value.hasOwnProperty("$")) { // Support { key: { $: "", $att: "" } }
        return value;

    } else if(type === "base64Binary") {
        return Buffer.from(value).toString('base64');

    } else if(type === "hexBinary") {
        return Buffer.from(value).toString('hex');

    } else {
        return value;
    }
}

function _convertFromXsdType(type, value) {
    if(type === "boolean") {
        return value === 'true';

    } else if(['decimal', 'double', 'float'].indexOf(type) > -1) {
        return parseFloat(value);

    } else if(['byte', 'int', 'integer', 'long', 'negativeInteger', 'nonNegativeInteger',
            'nonPositiveInteger', 'short', 'unsignedByte', 'unsignedInt', 'unsignedLong',
            'unsignedShort'].indexOf(type) > -1) {
        return parseInt(value, 10);

    } else if(type === "base64Binary") {
        return Buffer.from(value, 'base64');

    } else if(type === "hexBinary") {
        return Buffer.from(value, 'hex');

    } else {
        return value;
    }
}

function _generateDefinitionXml(obj) {
    let definition = {};

    Object.keys(obj).forEach((key) => {
        if(key.indexOf("$") > 0) {
            definition[key] = obj[key];

        } else {
            if(typeof obj[key] === 'object') {
                if(Array.isArray(obj[key])) {
                    definition[key + "$type"] = [];
                    if(obj[key].length > 0) {
                        let subDefinition = _generateDefinitionXml({ [key]: obj[key][0] });
                        if(subDefinition[key + "$type"]) {
                            definition[key + "$type"].push(subDefinition[key + "$type"]);

                        } else if(subDefinition[key]) {
                            definition[key] = subDefinition[key];
                        }
                    }

                } else {
                    definition[key] = _generateDefinitionXml(obj[key]);
                }

            } else {
                let value = obj[key];
                if(value === undefined || value === null || value === "") {
                    // Not enough information to guess the type

                } else if(value === "true" || value === "false") {
                    definition[key + "$type"] = "boolean";

                } else if(value.match(/^\d+$/)) {
                    definition[key + "$type"] = "int";

                } else if(value.match(/^\d+\.\d+$/)) {
                    definition[key + "$type"] = "float";

                } else if(value.match(/^[0-9A-Fa-f]{8,}$/)) {
                    definition[key + "$type"] = "hexBinary";

                } else if(value.match(/^([A-Za-z0-9+/]{4})*([A-Za-z0-9+/]{4}|[A-Za-z0-9+/]{3}=|[A-Za-z0-9+/]{2}==)$/)) {
                    definition[key + "$type"] = "base64Binary";

                } else {
                    definition[key + "$type"] = "string";
                }
                delete(obj[key]);
            }
        }
    });

    return definition;
}

// http://www.w3schools.com/xml/schema_elements_ref.asp
function _generateDefinitionXsd(schema, namespaces) {
    // TODO: Read namespaces from all levels
    // Make reverse lookup possible
    let namespaceToAlias = {};
    Object.keys(namespaces).forEach(function(key) {
        namespaceToAlias[namespaces[key]] = key;
    });

    // Build type lookup cache
    let typeLookupMap = {};
    let targetNamespace = schema.$targetNamespace; // TODO: Default to value
    let targetNamespaceAlias = namespaceToAlias[targetNamespace];
    if(!targetNamespaceAlias) {
        throw new Error("Unable to find alias for target namespace: '" + targetNamespace + "'");
    }
    ['simpleType', 'complexType', 'element'].forEach(function (xsdType) {
        (schema[xsdType] || []).forEach((type) => {
            let name = type.$name;
            // types and elements don't share symbol spaces
            typeLookupMap[(xsdType === "element" ? "" : "#") + targetNamespaceAlias + ":" + name] = type;
            typeLookupMap[(xsdType === "element" ? "" : "#") + targetNamespaceAlias + ":" + name + "$xsdType"] = xsdType;
        });
    });

    // Get definitions for all the elements
    let result = {};

    let elementFormQualified = schema.$elementFormDefault === "qualified";
    let attributeFormQualified = schema.attributeFormDefault === "qualified"; // TODO: implement
    let schemaNamespaces = _extractAndAddNamespaces(schema, namespaces);
    schema.element.forEach((element) => {
        let elementNamespaces = _extractAndAddNamespaces(schema, schemaNamespaces);

        // Save namespaces
        result[element.$name + "$attributes"] = {};
        Object.keys(elementNamespaces).forEach(function (key) {
            if(!["xmlns:tns", "xmlns:soap", "xmlns:xs"].includes(key)) {
                result[element.$name + "$attributes"][key] = elementNamespaces[key];
            }
        });

        if(Object.keys(result[element.$name + "$attributes"]).length == 0) {
            delete result[element.$name + "$attributes"];
        }

        // Generate definition for element and copy it to result
        let definition = _elementToDefinition("element", element, targetNamespace, elementFormQualified, attributeFormQualified, typeLookupMap, elementNamespaces);
        Object.keys(definition).forEach(function (key) {
            result[key] = definition[key];
            if(!elementFormQualified) {
                // TODO: sent on root object so we can extract it later
                // Set namespace on root elements if the elementForm == Unqualified
                result[key + "$namespace"] = namespaceToAlias[targetNamespace].replace(/^xmlns:/, '');
            }
        });

        /// TODO: Optimize namespaces so we only include the needed ones, by look at the returned definition
    });

    return result;
}

function _extractAndAddNamespaces(element, originalNamespaces) {
    let namespaces = originalNamespaces ? Object.assign({}, originalNamespaces) : {};
    Object.keys(element).forEach(function(key) {
        let ns = key.match(/^\$(xmlns:.+)$/);
        if (ns) {
            namespaces[ns[1]] = element[key];
        }
    });
    return namespaces;
}

function _elementToDefinition(xsdType, element, targetNamespace, elementFormQualified, attributeFormQualified, typeLookupMap, namespaces){
    // TODO: Find out if a namespace shadows another one higher up
    let elementNamespaces = _extractAndAddNamespaces(element, namespaces);

    // Make reverse lookup possible
    let namespaceToAlias = {};
    Object.keys(elementNamespaces).forEach(function(key) {
        namespaceToAlias[elementNamespaces[key]] = key;
    });

    let result = {};
    let subResult;
    let type;
    let maxLength = 0;
    let minLength = 0;

    if (xsdType === "element") {
        // Extract type
        if (element.$type) {
            type = element.$type;

        } else if (element.simpleType) {
            if (element.simpleType.restriction) {
                type = element.simpleType.restriction.$base;

                if(element.simpleType.restriction.length) {
                    maxLength = element.simpleType.restriction.length.$value;
                    minLength = element.simpleType.restriction.length.$value;

                } else {
                    if(element.simpleType.restriction.maxLength) {
                        maxLength = element.simpleType.restriction.maxLength.$value;
                    }
                    if(element.simpleType.restriction.minLength) {
                        minLength = element.simpleType.restriction.minLength.$value;
                    }
                }

            } else if (element.simpleType.list) {
                type = element.simpleType.list.$itemType;

            } else {
                throw new Error("Unknown simpleType structure");
            }

        } else if (element.complexType && (element.complexType.all || element.complexType.sequence)) {
            type = "object";
            subResult = _elementToDefinition("complexType", element.complexType, targetNamespace, elementFormQualified, attributeFormQualified, typeLookupMap, elementNamespaces);

        } else if (element.hasOwnProperty("complexType")) {
            type = "object"; // Handle <xs:element name="myEmptyElement"><xs:complexType/>...
            result[element.$name + "$type"] = "empty";

        } else if (Object.keys(element).length === 0) {
            type = "object"; // Handle <xs:element name="myEmptyElement"/>
            result[element.$name + "$type"] = "any";

        } else {
            throw new Error("Unknown element structure");
        }

        if(!['object', "any", "empty"].includes(type)) {
            for(let i= 0; i <= 3; i++) {
                if(i === 3) {
                    throw new Error("Type reference nested more than 3 levels");
                }

                // Resolve type namespace
                let typeNamespace = _namespaceLookup(type, elementNamespaces);

                if (typeNamespace.ns === "http://www.w3.org/2001/XMLSchema") {
                    result[element.$name + "$type"] = typeNamespace.name;
                    break;

                } else {
                    // Look up type if it's not a xsd native type
                    let subElement = typeLookupMap["#" + "xmlns:"+ type];
                    let subXsdType = typeLookupMap["#" + "xmlns:" + type + "$xsdType"];
                    if (subElement) {
                        if (subXsdType === "complexType" || subXsdType === "element") {
                            subResult = _elementToDefinition(subXsdType, subElement, targetNamespace, elementFormQualified, attributeFormQualified, typeLookupMap, elementNamespaces);
                            break;

                        } else if (subXsdType === "simpleType") {
                            if (subElement.restriction) {
                                type = subElement.restriction.$base;

                                if(subElement.restriction.length) {
                                    maxLength = parseInt(subElement.restriction.length.$value, 10);
                                    minLength = maxLength;

                                } else {
                                    if(subElement.restriction.maxLength) {
                                        maxLength = parseInt(subElement.restriction.maxLength.$value, 10);
                                    }
                                    if(subElement.restriction.minLength) {
                                        minLength = parseInt(subElement.restriction.minLength.$value, 10);
                                    }
                                }

                            } else if (subElement.list) {
                                type = subElement.list.$itemType;

                            } else {
                                throw new Error("Unknown simpleType structure");
                            }

                        } else {
                            throw new Error("Unknown XSD type '" + subXsdType);
                        }

                    } else {
                        throw new Error("Could not find type '" + typeNamespace.name + "' in namespace '" + typeNamespace.ns + "'");
                    }
                }
            }
        }

        if(subResult) {
            if(subResult.$type) {
                result[element.$name + "$type"] = subResult.$type;

            } else {
                result[element.$name] = {};
                Object.keys(subResult).forEach(function (key) {
                    if(key.startsWith("$")) {
                        result[element.$name + key] = subResult[key];
                    } else {
                        result[element.$name][key] = subResult[key];
                    }
                });
            }

        } else {
            //result[element.$name] = "";
        }

        if(elementFormQualified) {
            // Save namespace
            result[element.$name + "$namespace"] = namespaceToAlias[targetNamespace].replace(/^xmlns:/, '');
        }

        let maxOccurs = parseInt(element.$maxOccurs ===  "unbounded" ? Number.MAX_VALUE : (element.$maxOccurs || 0), 10);
        let minOccurs = parseInt(element.$minOccurs || 0, 10);

        // Check if this type is an array
        if (maxOccurs > 1) {
            result[element.$name + "$type"] = [result[element.$name + "$type"], minOccurs, maxOccurs];
        }

        if(maxLength > 0) {
            result[element.$name + "$length"] = [minLength, maxLength];
        }

    } else if(xsdType === "complexType") {
        let elements;
        if(element.all) {
            elements = element.all.element;

        } else if (element.sequence) {
            if(element.sequence.element) {
                elements = element.sequence.element;

            } else if(element.sequence.hasOwnProperty("any")) {
                elements = [];
                result["$type"] = "any";

            } else {
                throw new Error("Unknown complexType sequence structure");
            }

            result["$order"] = [];

        } else {
            return; // TODO: Handle this a bit better
            //throw new Error("Unknown complexType structure");
        }

        elements = Array.isArray(elements) ? elements : [elements];
        elements.forEach(function(subElement) {
            let subResult = _elementToDefinition("element", subElement, targetNamespace, elementFormQualified, attributeFormQualified, typeLookupMap, namespaces);
            Object.keys(subResult).forEach(function (key) {
                result[key] = subResult[key];
            });
            if(result.hasOwnProperty("$order")) {
                result["$order"].push(subElement.$name);
            }
        });

    }

    return result;
}

function _namespaceLookup(name, namespaces) {
    let result;
    let ns = name.split(":");
    if (ns.length > 1) {
        if (namespaces.hasOwnProperty("xmlns:" + ns[0])) {
            result = { name: ns[1], ns: namespaces["xmlns:" + ns[0]] };

        } else {
            throw new Error("Could not find namespace alias '" + name + "'");
        }

    } else {
        result = { name: name, ns: "" };
    }

    return result;
}

function _generateSample(definition) {
    let result = {};

    Object.keys(definition).forEach(function (key) {
        if(key.endsWith("$type")) {
            let keyName = key.replace(/\$type$/, '');
            let length = definition[keyName + "$length"] || [1, 1];

            if(Array.isArray(definition[key])) {
                let value = _generateXsdTypeSample(definition[key][0], length[1]);
                result[keyName] = new Array(definition[key][2]).fill(value);

            } else {
                result[keyName] = _generateXsdTypeSample(definition[key], length[1]);
            }

        } else if(key.indexOf("$") === -1 && typeof definition[key] === 'object') {
            result[key] = _generateSample(definition[key]);
        }
    });

    return result;
}

function _generateXsdTypeSample(type, length) {
    // http://www.xml.dvint.com/docs/SchemaDataTypesQR-2.pdf
    switch(type) {
        case "boolean": return true;
        case "base64Binary": return " ".repeat(length);
        case "hexBinary": return " ".repeat(length);
        case "anyURI": return "http://sample.com";
        case "language": return "en";
        case "normalizedString": return " ".repeat(length);
        case "string": return " ".repeat(length);
        case "token": return " ".repeat(length);
        case "byte": return 0;
        case "decimal": return 0.0;
        case "double": return 0.0;
        case "float": return 0.0;
        case "int": return 0;
        case "integer": return 0;
        case "long": return 0;
        case "negativeInteger": return -1;
        case "nonNegativeInteger": return 1;
        case "nonPositiveInteger": return -1;
        case "short": return 0;
        case "unsignedByte": return 0;
        case "unsignedInt": return 0;
        case "unsignedLong": return 0;
        case "unsignedShort": return 0;
        case "empty": return "";
        case "any": return {};
        default: throw new Error("Unknown XSD type '" + type + "'");
    }
}

function _compareArray(array1, array2) {
    if (!array1 || !array2) {
        return false;
    }

    if (array1.length != array2.length) {
        return false;
    }

    for (let i=0; i < array1.length; i++) {
        if(array1[i] !== array2[i]) {
            return false;
        }
    }
    return true;
}

module.exports = {
    toXml,
    fromXml,
    generateDefinition,
    generateSample,
    Parser
};
