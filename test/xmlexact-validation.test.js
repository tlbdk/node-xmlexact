/*eslint-env node, mocha */

const assert = require("chai").assert;
const xmlExact = require("../src/xmlexact");

describe("Validation", () => {
    const definition = {
        complexAll: {
            boolean$type: "boolean",
            float$type: "float",
            int$type: "int",
            string$type: "string",
            string$length: [2, 10]
        },
    };
    const validObj1 = {
        complexAll: {
            boolean: true,
            float: 1.1,
            int: 1,
            string: "  "
        },
        complexAll$order: [
            "boolean1",
            "boolean2",
            "float",
            "int"
        ]
    };

    it("toXml", () => {
        let generatedXml = xmlExact.toXml(validObj1, "complexAll", definition);
        assert.isNotNull(generatedXml);
    });
});