"use strict";

const expat = require('node-expat');

const defaultToXmlOptions = {
    indentation: 2,
    optimizeEmpty: true,
    convertTypes: true
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
        [rootName]: _generateSample(definition[rootName], rootName)
    }
}

function generateDefinition(xml) {
    let obj = _fromXml(xml, null, false, false);
    return _generateDefinition(obj);
}

class Parser {
    constructor(definition, options = {}) {
        this._definition = definition;
        this._options = options;
    }

    toXml(obj, rootName) {
        return toXml(obj, rootName, this._definition, this._options);
    }

    fromXml(xml, options) {
        return fromXml(xml, this._definition, this._options);
    }

    generateSample(rootName) {
        return generateSample(this._definition, this._options);
    }

    generateDefinition(xml) {
        return generateDefinition(xml);
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
    let attributes = Object.assign({}, definition[parentName + "$attributes"] || {});
    let order = obj[parentName + "$order"] || definition[parentName + "$order"];
    let type = obj[parentName + "$type"] || definition[parentName + "$type"];

    let whitespace = " ".repeat(level * indentation);

    if(level === 0) {
        // Go into first level
        obj = obj[parentName];
    }

    if(typeof obj === undefined || obj === null) {
        // TODO: Handle null types
        return result;
    }

    if(convertTypes) {
        if(type === "base64Binary") {
            obj = Buffer.from(obj).toString('base64');

        } else if(type === "hexBinary") {
            obj = Buffer.from(obj).toString('hex');
        }
    }

    if(Array.isArray(obj)) {
        obj.forEach(function(value) {
            result += _toXml(value, definition, namespace + parentName, indentation, optimizeEmpty, convertTypes, level);
        });

    } else if(typeof obj === "object") {
        let keys = Object.getOwnPropertyNames(obj);
        if(order) {
            keys = keys.sort(function(a, b) {
                return order.indexOf(a) - order.indexOf(b);
            });
        }

        let subResult = "";
        keys.forEach(function(key) {
            if(key === "$") { // TODO: Support data before and after
                subResult += obj[key];

            } else if(key === "namespace$") {
                namespace = obj[key] + ":";

            } else if(key.indexOf("$") == 0) {
                attributes[key.substr(1)] = obj[key];

            } else if(key.indexOf("$") > 0) {
                // Skip definition information such as order

            } else {
                subResult += _toXml(obj[key], definition[parentName], key, indentation, optimizeEmpty, convertTypes, level + 1);
            }
        });

        // Generate start and end tag
        result += whitespace + "<" + namespace +  parentName;
        Object.getOwnPropertyNames(attributes).forEach(function(key){
            result += " " + key + '="' + attributes[key] + '"';
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
        return value.replace(/((?:&(?!(?:apos|quot|[gl]t|amp);))|(?:^<!\[CDATA\[.+?]]>)|[<>'"])/g, function(match, p1) {
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

    parser.on('startElement', function(name, attributes) {
        // TODO: Handle namespaces in a nice way
        // Parse namespace
        let ns = name.split(":");
        if(ns.length > 1) {
            name = ns[1];
            ns = ns[0];
        } else {
            ns = undefined;
        }

        const definition = definitions[definitions.length - 1];
        currentType = definition[name + "$type"];
        let nextObject = {};
        currentValue = ""; // TODO: Create $t value on object if this has data

        if(ns && definition[name + "$namespace"] !== ns) {
            if(inlineAttributes) {
                nextObject["namespace" + "$"] = ns;

            } else {
                currentObject[name + "$namespace"] = ns;
            }
        }

        // Filter attributes so we only include ones not in definition
        Object.keys(definition[name + "$attributes"] || {}).forEach((attribute) => {
            delete attributes[attribute];
        });

        // Handle attributes
        if(Object.getOwnPropertyNames(attributes).length > 0) {
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
                        if(currentType === "boolean") {
                            currentObject[name] = currentValue === 'true';

                        } else if(['decimal', 'double', 'float'].indexOf(currentType) > -1) {
                            currentObject[name] = parseFloat(currentValue);

                        } else if(['byte', 'int', 'integer', 'long', 'negativeInteger', 'nonNegativeInteger',
                                'nonPositiveInteger', 'short', 'unsignedByte', 'unsignedInt', 'unsignedLong',
                                'unsignedShort'].indexOf(currentType) > -1) {
                            currentObject[name] = parseInt(currentValue);

                        } else if(currentType === "base64Binary") {
                            currentObject[name] = Buffer.from(currentValue, 'base64');

                        } else if(currentType === "hexBinary") {
                            currentObject[name] = Buffer.from(currentValue, 'hex');

                        } else {
                            currentObject[name] = currentValue;
                        }

                    } else {
                        currentObject[name] = currentValue; // TODO: Handle inline attributes
                    }

                } else if(currentValue != '') {
                    currentObject[name].$ = currentValue;
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

function _generateDefinition(obj) {
    let definition = {};

    Object.keys(obj).forEach((key) => {
        if(key.indexOf("$") > 0) {
            definition[key] = obj[key];

        } else {
            if(typeof obj[key] === 'object') {
                if(Array.isArray(obj[key])) {
                    definition[key + "$type"] = [];
                    if(obj[key].length > 0) {
                        let subDefinition = _generateDefinition({ [key]: obj[key][0] });
                        if(subDefinition[key + "$type"]) {
                            definition[key + "$type"].push(subDefinition[key + "$type"]);

                        } else if(subDefinition[key]) {
                            definition[key] = subDefinition[key];
                        }
                    }

                } else {
                    definition[key] = _generateDefinition(obj[key]);
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


function _generateSample(definition, level = 0) {
    let result = {};

    Object.keys(definition).forEach(function (key) {
        if(key.endsWith("$type")) {
            let keyName = key.replace(/\$type$/, '');
            let length = definition[keyName + "$length"] || [1, 1];

            if(Array.isArray(definition[key])) {
                let value = _xsdTypeLookup(definition[key][0], length[1]);
                result[keyName] = new Array(definition[key][2]).fill(value);

            } else {
                result[keyName] = _xsdTypeLookup(definition[key], length[1]);
            }

        } else if(key.indexOf("$") === -1 && typeof definition[key] === 'object') {
            result[key] = _generateSample(definition[key], key, level + 1);
        }
    });

    return result;
}

function _xsdTypeLookup(type, length) {
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
