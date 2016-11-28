/*eslint-env node, mocha */

const assert = require("chai").assert;
const XmlExact = require("../src/xmlexact");

describe("XSD definition generation", () => {
    it("Most used XSD types", () => {
        const xsdXml =
            "<xs:schema xmlns:xs=\"http://www.w3.org/2001/XMLSchema\" elementFormDefault=\"qualified\" targetNamespace=\"http://tempuri.org\">\n" +
            "  <xs:element name=\"plain\" type=\"xs:string\">\n" +
            "  </xs:element>\n" +
            "  <xs:element name=\"simple\">\n" +
            "    <xs:simpleType>\n" +
            "      <xs:restriction base=\"xs:string\">\n" +
            "        <xs:pattern value=\"[a-zA-Z0-9]{8}\" />\n" +
            "      </xs:restriction>\n" +
            "    </xs:simpleType>\n" +
            "  </xs:element>\n" +
            "  <xs:element name=\"complexAll\">\n" +
            "    <xs:complexType>\n" +
            "      <xs:all>\n" +
            "        <xs:element name=\"tickerSymbola\" type=\"xs:string\">\n" +
            "        </xs:element>\n" +
            "        <xs:element name=\"tickerSymbolb\" type=\"xs:string\">\n" +
            "        </xs:element>\n" +
            "      </xs:all>\n" +
            "    </xs:complexType>\n" +
            "  </xs:element>\n" +
            "  <xs:element name=\"complexSequence\">\n" +
            "    <xs:complexType>\n" +
            "      <xs:sequence>\n" +
            "        <xs:element name=\"tickerSymbol1\" type=\"xs:string\">\n" +
            "        </xs:element>\n" +
            "        <xs:element name=\"tickerSymbol2\" type=\"xs:string\">\n" +
            "        </xs:element>\n" +
            "        <xs:element name=\"plainArray\" type=\"xs:string\" minOccurs=\"0\" maxOccurs=\"2\">\n" +
            "        </xs:element>\n" +
            "      </xs:sequence>\n" +
            "    </xs:complexType>\n" +
            "  </xs:element>\n" +
            "  <xs:element name=\"refrencedComplexSequence\" type=\"myns:tickerType\">\n" +
            "  </xs:element>\n" +
            "  <xs:element name=\"refrencedSimpleRestriction\" type=\"myns:verySimpleType\">\n" +
            "  </xs:element>\n" +
            "  <xs:complexType name=\"tickerType\">\n" +
            "    <xs:sequence>\n" +
            "      <xs:element name=\"tickerSymbolx\" type=\"xs:string\">\n" +
            "      </xs:element>\n" +
            "      <xs:element name=\"tickerSymboly\" type=\"xs:string\">\n" +
            "      </xs:element>\n" +
            "    </xs:sequence>\n" +
            "  </xs:complexType>\n" +
            "  <xs:simpleType name=\"verySimpleType\">\n" +
            "    <xs:restriction base=\"xs:string\">\n" +
            "      <xs:maxLength value=\"3\" />\n" +
            "    </xs:restriction>\n" +
            "  </xs:simpleType>\n" +
            "</xs:schema>\n";

        const expectedXsdDefinition = {
            plain$attributes: { "xmlns:myns": "http://tempuri.org" },
            plain$type: "string",
            plain$namespace: "myns",
            simple$attributes: { "xmlns:myns": "http://tempuri.org" },
            simple$type: "string",
            simple$namespace: "myns",
            complexAll$attributes: { "xmlns:myns": "http://tempuri.org" },
            complexAll$namespace: "myns",
            complexAll: {
                tickerSymbola$type: "string",
                tickerSymbola$namespace: "myns",
                tickerSymbolb$type: "string",
                tickerSymbolb$namespace: "myns",
            },
            complexSequence$attributes: { "xmlns:myns": "http://tempuri.org" },
            complexSequence$order: ["tickerSymbol1", "tickerSymbol2", "plainArray"],
            complexSequence$namespace: "myns",
            complexSequence: {
                tickerSymbol1$type: "string",
                tickerSymbol1$namespace: "myns",
                tickerSymbol2$type: "string",
                tickerSymbol2$namespace: "myns",
                plainArray$type: ["string", 0, 2],
                plainArray$namespace: "myns"
            },
            refrencedComplexSequence$attributes: { "xmlns:myns": "http://tempuri.org" },
            refrencedComplexSequence$order: ["tickerSymbolx", "tickerSymboly"],
            refrencedComplexSequence$namespace: "myns",
            refrencedComplexSequence: {
                tickerSymbolx$type: "string",
                tickerSymbolx$namespace: "myns",
                tickerSymboly$type: "string",
                tickerSymboly$namespace: "myns",
            },
            refrencedSimpleRestriction$attributes: { "xmlns:myns": "http://tempuri.org" },
            refrencedSimpleRestriction$length: [0,3],
            refrencedSimpleRestriction$type: "string",
            refrencedSimpleRestriction$namespace: "myns",
        };

        let generatedXsdDefinition = XmlExact.generateDefinition(xsdXml, "xsd", { "xmlns:myns": "http://tempuri.org" });
        assert.deepEqual(generatedXsdDefinition, expectedXsdDefinition);
    });

    it("xsd_simple with references", () => {
        const xsdXml =
            "<xs:schema xmlns:xs=\"http://www.w3.org/2001/XMLSchema\" elementFormDefault=\"qualified\" targetNamespace=\"http://tempuri.org\">\n" +
            "  <xs:element name=\"MyElement\" type=\"myns:MyType\">\n" +
            "  </xs:element>\n" +
            "  <xs:simpleType name=\"MyType\">\n" +
            "    <xs:restriction base=\"xs:string\">\n" +
            "      <xs:maxLength value=\"8\" />\n" +
            "    </xs:restriction>\n" +
            "  </xs:simpleType>\n" +
            "</xs:schema>\n";

        const expectedXsdDefinition = {
            MyElement$attributes: {
                "xmlns:myns": "http://tempuri.org"
            },
            MyElement$namespace: "myns",
            MyElement$type: "string",
            MyElement$length: [0, 8],
        };

        let generatedXsdDefinition = XmlExact.generateDefinition(xsdXml, "xsd", { "xmlns:myns": "http://tempuri.org" });
        assert.deepEqual(generatedXsdDefinition, expectedXsdDefinition);
    });

    it("xsd_complexTypeSequence with references", () => {
        let xsdXml =
            "<xs:schema xmlns:xs=\"http://www.w3.org/2001/XMLSchema\" elementFormDefault=\"qualified\" targetNamespace=\"http://tempuri.org\">\n" +
            "  <xs:element name=\"MyElement\" type=\"myns:TradePriceRequest\">\n" +
            "  </xs:element>\n" +
            "  <xs:complexType name=\"TradePriceRequest\">\n" +
            "    <xs:sequence>\n" +
            "      <xs:element name=\"tickerSymbol1\" type=\"xs:string\">\n" +
            "      </xs:element>\n" +
            "      <xs:element name=\"tickerSymbol2\" type=\"xs:string\">\n" +
            "      </xs:element>\n" +
            "    </xs:sequence>\n" +
            "  </xs:complexType>\n" +
            "</xs:schema>\n";

        let expectedXsdDefinition = {
            MyElement: {
                tickerSymbol1$namespace: "myns",
                tickerSymbol1$type: "string",
                tickerSymbol2$namespace: "myns",
                tickerSymbol2$type: "string",
            },
            MyElement$attributes: {
                "xmlns:myns": "http://tempuri.org"
            },
            MyElement$namespace: "myns",
            MyElement$order: ["tickerSymbol1", "tickerSymbol2"]
        };

        let generatedXsdDefinition = XmlExact.generateDefinition(xsdXml, "xsd", { "xmlns:myns": "http://tempuri.org" });
        assert.deepEqual(generatedXsdDefinition, expectedXsdDefinition);
    });
});