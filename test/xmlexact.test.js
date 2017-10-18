/*eslint-env node, mocha */

const assert = require('chai').assert
const XmlExact = require('../src/xmlexact')

describe('XMLUtils#toXML/fromXML mixed inline and definition', () => {
  it('sample should convert to XML that looks the same as sample_xml', () => {
    const definition = {
      root$attributes: { 'xmlns:myns': 'http://tempuri.org' },
      root: {
        list$namespace: 'myns',
        list$attributes: { outer: 'hello' },
        list: {
          item$namespace: 'myns'
        }
      }
    }

    const obj = {
      root: {
        '$xmlns:xs': 'http://www.w3.org/2001/XMLSchema', // Define a new namespace inline
        list: {
          'xs:item': [
            {
              $inline: 'first',
              $: 'value1'
            },
            {
              namespace$: 'myns',
              $inline: 'second',
              $: 'value2'
            },
            'value3'
          ],
          item: 'after'
        }
      }
    }

    const xml = [
      '<root xmlns:myns="http://tempuri.org" xmlns:xs="http://www.w3.org/2001/XMLSchema">',
      '  <myns:list outer="hello">',
      '    <xs:item inline="first">value1</xs:item>',
      '    <myns:item inline="second">value2</myns:item>',
      '    <xs:item>value3</xs:item>',
      '    <myns:item>after</myns:item>',
      '  </myns:list>',
      '</root>'
    ].join('\n')

    const generated_xml = XmlExact.toXml(obj, 'root', definition)
    assert.strictEqual(generated_xml, xml)
  })
})

describe('XMLUtils#toXML/fromXML simple', function() {
  const sample_obj = {
    root: {
      first: {
        firstNested: '',
        secondNested: ''
      },
      second: '',
      last: {
        stuff: ''
      }
    }
  }

  const sample_xml = [
    '<root>',
    '  <first>',
    '    <firstNested></firstNested>',
    '    <secondNested></secondNested>',
    '  </first>',
    '  <second></second>',
    '  <last>',
    '    <stuff></stuff>',
    '  </last>',
    '</root>'
  ].join('\n')

  it('sample should convert to XML that looks the same as sample_xml', () => {
    const generated_xml = XmlExact.toXml(sample_obj, 'root', null, {
      optimizeEmpty: false
    })
    assert.strictEqual(generated_xml, sample_xml)
  })

  it('should return the order of the elements and convert back to the same sample_xml', () => {
    const generated_obj = XmlExact.fromXml(sample_xml)
    assert.deepEqual(generated_obj['root$order'], ['first', 'second', 'last'])
    assert.deepEqual(generated_obj['root']['first$order'], [
      'firstNested',
      'secondNested'
    ])

    const generated_xml = XmlExact.toXml(generated_obj, 'root', null, {
      optimizeEmpty: false
    })
    assert.strictEqual(generated_xml, sample_xml)
  })
})

describe('XMLUtils#toXML/fromXML complex object', function() {
  const sample_obj = {
    Envelope: {
      Header: {
        $myObjectAttib: 'aValue1',
        arrays: {
          array: [
            {
              $mySingleArrayAttrib: 'test',
              key: 'value1'
            },
            {
              key: 'value2'
            },
            {
              key: 'value3'
            }
          ]
        }
      },
      Body: {
        value: 'stuff',
        values: {
          value: ['a', 'b', 'c']
        },
        Fault: ''
      },
      'soap:SameName': 'name1',
      'soap2:SameName': 'name2',
      isArray: ['Stuff']
    }
  }

  const sample_definition = {
    Envelope$namespace: 'soap',
    Envelope$attributes: {
      'xmlns:myns1': 'http://myns1',
      'xmlns:myns2': 'http://myns1',
      'xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope/',
      'xmlns:soap2': 'http://www.w3.org/2003/05/soap-envelope/',
      'soap:encodingStyle': 'http://www.w3.org/2003/05/soap-encoding'
    },
    Envelope$order: ['Header', 'Body'],
    Envelope: {
      Header$namespace: 'soap',
      Header: {
        arrays: {
          array$type: [],
          array$attributes: {
            SameOnAll: 'same'
          }
        }
      },
      Body$namespace: 'soap',
      Body: {
        value: 'string',
        values$attributes: {
          'xmlns:stuff': 'http://www.w3.org/2003/05/soap-encoding'
        },
        values: {
          value$namespace: 'stuff',
          value$type: []
        }
      },
      isArray$type: [],
      'myns1:overlaps$type': [], // TODO: implement
      'myns2:overlaps$type': []
    }
  }

  //console.log(JSON.stringify(result, null, 2));
  it('should convert to XML and back to js again', () => {
    const xml = XmlExact.toXml(sample_obj, 'Envelope', sample_definition)
    assert.isTrue(xml.startsWith('<soap:Envelope'))
    const obj = XmlExact.fromXml(xml, sample_definition)
    assert.deepEqual(
      obj.Envelope.Body.values.value,
      sample_obj.Envelope.Body.values.value
    )
  })
})

describe('XMLUtils#toXML/fromXML simple', function() {
  const sample_obj = {
    root: {
      first: {
        firstNested: '',
        secondNested: ''
      },
      second: '',
      last: {
        stuff: 'test'
      }
    }
  }

  const sample_xml = [
    '<root>',
    '  <first>',
    '    <firstNested />',
    '    <secondNested />',
    '  </first>',
    '  <second />',
    '  <last>',
    '    <stuff>test</stuff>',
    '  </last>',
    '</root>'
  ].join('\n')

  it('sample should convert to XML that looks the same as sample_xml', () => {
    const generated_xml = XmlExact.toXml(sample_obj, 'root')
    assert.strictEqual(sample_xml, generated_xml)
  })
})

describe('Binary encoding', function() {
  const definition = {
    complexAll$attributes: {
      base64Binary$type: 'base64Binary',
      hexBinary$type: 'hexBinary'
    },
    complexAll: {
      base64Binary$type: 'base64Binary',
      hexBinary$type: 'hexBinary',
      base64BinaryWithAttribute$type: 'base64Binary',
      arrayOfBase64Binary$type: ['base64Binary']
    }
  }

  const obj = {
    complexAll: {
      $base64Binary: Buffer.from('ÆØÅ'),
      $hexBinary: Buffer.from('ÅØÆ'),
      base64Binary: Buffer.from('ÆØÅ'),
      hexBinary: Buffer.from('ÅØÆ'),
      base64BinaryWithAttribute: {
        $: Buffer.from('ÆØÅ'),
        $test: 'hello'
      },
      arrayOfBase64Binary: [Buffer.from('ÆØÅ'), Buffer.from('ÆØÅ')]
    },
    complexAll$order: ['base64Binary', 'hexBinary', 'base64BinaryWithAttribute']
  }

  const expectedXml = [
    '<complexAll base64Binary="w4bDmMOF" hexBinary="c385c398c386">',
    '  <base64Binary>w4bDmMOF</base64Binary>',
    '  <hexBinary>c385c398c386</hexBinary>',
    '  <base64BinaryWithAttribute test="hello">w4bDmMOF</base64BinaryWithAttribute>',
    '  <arrayOfBase64Binary>w4bDmMOF</arrayOfBase64Binary>',
    '  <arrayOfBase64Binary>w4bDmMOF</arrayOfBase64Binary>',
    '</complexAll>'
  ].join('\n')

  it('Base64/Hex Encode', () => {
    const generatedXml = XmlExact.toXml(obj, 'complexAll', definition)
    assert.strictEqual(generatedXml, expectedXml)
  })
  it('Base64/Hex Decode', () => {
    const generatedObj = XmlExact.fromXml(expectedXml, definition)
    assert.deepEqual(generatedObj, obj)
  })
})

describe('Types', function() {
  const definition = {
    complexAll$attributes: {
      boolean1$type: 'boolean',
      boolean2$type: 'boolean',
      float$type: 'float',
      int$type: 'int'
    },
    complexAll: {
      boolean1$type: 'boolean',
      boolean2$type: 'boolean',
      float$type: 'float',
      int$type: 'int',
      intWithAttribute$type: 'int',
      intWithDefinedAttribute$type: 'int',
      intWithDefinedAttribute$attributes: {
        test: 'hello'
      }
    },
    complexAll$order: [
      'boolean1',
      'boolean2',
      'float',
      'int',
      'intWithAttribute',
      'intWithDefinedAttribute'
    ]
  }
  const obj = {
    complexAll: {
      $boolean1: true,
      $boolean2: false,
      $float: 1.1,
      $int: 1,
      boolean1: true,
      boolean2: false,
      float: 1.1,
      int: 1,
      intWithAttribute: {
        $: 1,
        $test: 'hello'
      },
      intWithDefinedAttribute: 1
    }
  }

  const xml = [
    '<complexAll boolean1="true" boolean2="false" float="1.1" int="1">',
    '  <boolean1>true</boolean1>',
    '  <boolean2>false</boolean2>',
    '  <float>1.1</float>',
    '  <int>1</int>',
    '  <intWithAttribute test="hello">1</intWithAttribute>',
    '  <intWithDefinedAttribute test="hello">1</intWithDefinedAttribute>',
    '</complexAll>'
  ].join('\n')

  it('to', () => {
    const generatedXml = XmlExact.toXml(obj, 'complexAll', definition)
    assert.strictEqual(generatedXml, xml)
  })

  it('from', () => {
    const generatedObj = XmlExact.fromXml(xml, definition)
    assert.deepEqual(generatedObj, obj)
  })
})

describe('Escaping', function() {
  const obj = {
    complexAll: {
      nestedXml: '<xml>...</xml>',
      charsXml: '%<>"\'',
      charsRaw: '&gt;&lt;&amp;',
      cdata: "<![CDATA['><]]>",
      comment: '<!-- my comment -->'
    }
  }
  const objParsed = {
    complexAll: {
      nestedXml: '<xml>...</xml>',
      charsXml: '%<>"\'',
      charsRaw: '><&',
      cdata: "'><",
      comment: '<!-- my comment -->'
    },
    complexAll$order: ['nestedXml', 'charsXml', 'charsRaw', 'cdata', 'comment']
  }

  const xml = [
    '<complexAll>',
    '  <nestedXml>&lt;xml&gt;...&lt;/xml&gt;</nestedXml>',
    '  <charsXml>%&lt;&gt;&quot;&apos;</charsXml>',
    '  <charsRaw>&gt;&lt;&amp;</charsRaw>',
    "  <cdata><![CDATA['><]]></cdata>",
    '  <comment>&lt;!-- my comment --&gt;</comment>',
    '</complexAll>'
  ].join('\n')

  it('to', () => {
    const generatedXml = XmlExact.toXml(obj, 'complexAll')
    assert.strictEqual(generatedXml, xml)
  })

  it('from', () => {
    const generatedObj = XmlExact.fromXml(xml, 'complexAll')
    assert.deepEqual(generatedObj, objParsed)
  })
})

describe('Sample generation', function() {
  it('Simple', () => {
    const definition = {
      complexAll$attributes: {
        'xmlns:myns': 'http://tempuri.org',
        'xmlns:xs': 'http://www.w3.org/2001/XMLSchema'
      },
      complexAll$namespace: 'myns',
      complexAll: {
        tickerSymbola$type: 'string',
        tickerSymbola$namespace: 'myns',
        tickerSymbolb$type: 'string',
        tickerSymbolb$namespace: 'myns'
      }
    }

    const expected = {
      complexAll: {
        tickerSymbola: ' ',
        tickerSymbolb: ' '
      }
    }

    const sample = XmlExact.generateSample('complexAll', definition)
    assert.deepEqual(sample, expected)
  })

  it('Length and Array', () => {
    const definition = {
      complexAllLength$attributes: {
        'xmlns:myns': 'http://tempuri.org',
        'xmlns:xs': 'http://www.w3.org/2001/XMLSchema'
      },
      complexAllLength$namespace: 'myns',
      complexAllLength: {
        tickerSymbola$type: 'string',
        tickerSymbola$length: [10, 10], // String of length 10
        tickerSymbola$namespace: 'myns',
        tickerSymbolb$type: ['string', 2, 2], // String array with length of 2
        tickerSymbolb$length: [1, 1], // Item length of 1
        tickerSymbolb$namespace: 'myns'
      }
    }

    const expected = {
      complexAllLength: {
        tickerSymbola: '          ',
        tickerSymbolb: [' ', ' ']
      }
    }

    const sample = XmlExact.generateSample('complexAllLength', definition)
    assert.deepEqual(sample, expected)
  })
})

describe('Test soap envelope', function() {
  const soapDefinition = {
    Envelope$namespace: 'soap',
    Envelope$attributes: {
      'xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope/',
      'soap:encodingStyle': 'http://www.w3.org/2003/05/soap-encoding'
    },
    Envelope$order: ['Header', 'Body'],
    Envelope: {
      Header$namespace: 'soap',
      Body$namespace: 'soap',
      Body: {
        complexAll: {
          boolean1$type: 'boolean'
        }
      }
    }
  }

  const expectedSoapObj = {
    Envelope: {
      Header: '',
      Body: {
        complexAll: {
          boolean1: true
        }
      }
    }
  }

  const expectedSoapXml = [
    '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope/" soap:encodingStyle="http://www.w3.org/2003/05/soap-encoding">',
    '  <soap:Header />',
    '  <soap:Body>',
    '    <complexAll>',
    '      <boolean1>true</boolean1>',
    '    </complexAll>',
    '  </soap:Body>',
    '</soap:Envelope>'
  ].join('\n')

  const expectedSoapOtherNsAliasXml = [
    '<soapenv:Envelope xmlns:soapenv="http://www.w3.org/2003/05/soap-envelope/" soapenv:encodingStyle="http://www.w3.org/2003/05/soap-encoding">',
    '  <soapenv:Header />',
    '  <soapenv:Body>',
    '    <complexAll>',
    '      <boolean1>true</boolean1>',
    '    </complexAll>',
    '  </soapenv:Body>',
    '</soapenv:Envelope>'
  ].join('\n')

  it('to', () => {
    const generatedSoapXml = XmlExact.toXml(
      expectedSoapObj,
      'Envelope',
      soapDefinition
    )
    assert.strictEqual(generatedSoapXml, expectedSoapXml)
  })

  it('from', () => {
    const generatedSoapObj = XmlExact.fromXml(expectedSoapXml, soapDefinition)
    assert.deepEqual(generatedSoapObj, expectedSoapObj)
  })

  it('fromNsAliasMapping', () => {
    const generatedSoapObj = XmlExact.fromXml(
      expectedSoapOtherNsAliasXml,
      soapDefinition
    )
    assert.deepEqual(generatedSoapObj, expectedSoapObj)
  })
})

describe('XMLBlob', () => {
  const definition = {
    complexAll: {
      xmlBlob$type: 'xml'
    }
  }

  const expectedXml = [
    '<complexAll>',
    '  <xmlBlob>',
    '    <myxml>stuff</myxml>',
    '  </xmlBlob>',
    '</complexAll>'
  ].join('\n')

  const obj = {
    complexAll: {
      xmlBlob: '<myxml>stuff</myxml>'
    }
  }

  it('toXml', () => {
    const generatedXml = XmlExact.toXml(obj, 'complexAll', definition)
    assert.strictEqual(generatedXml, expectedXml)
  })
})

describe('XML definition generation', () => {
  const soapXml = [
    '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope/" soap:encodingStyle="http://www.w3.org/2003/05/soap-encoding">',
    '  <soap:Header />',
    '  <soap:Body>',
    '    <complexAll>',
    '      <boolean1>true</boolean1>',
    '      <boolean2>true</boolean2>',
    '      <float>1.00</float>',
    '      <int>1124</int>',
    '    </complexAll>',
    '    <simpleArray>',
    '      <item>value</item>',
    '      <item>value</item>',
    '    </simpleArray>',
    '    <complexArray>',
    '      <item>',
    '        <int>1124</int>',
    '        <string>value</string>',
    '      </item>',
    '    </complexArray>',
    '  </soap:Body>',
    '</soap:Envelope>'
  ].join('\n')

  const expectedSoapDefinition = {
    Envelope$namespace: 'soap',
    Envelope$attributes: {
      'xmlns:soap': 'http://www.w3.org/2003/05/soap-envelope/',
      'soap:encodingStyle': 'http://www.w3.org/2003/05/soap-encoding'
    },
    Envelope$order: ['Header', 'Body'],
    Envelope: {
      Header$namespace: 'soap',
      Body$namespace: 'soap',
      Body: {
        complexAll: {
          boolean1$type: 'boolean',
          boolean2$type: 'boolean',
          float$type: 'float',
          int$type: 'int'
        },
        complexAll$order: ['boolean1', 'boolean2', 'float', 'int'],
        simpleArray: {
          item$type: ['string']
        },
        complexArray: {
          item: {
            int$type: 'int',
            string$type: 'string'
          },
          item$order: ['int', 'string']
        }
      },
      Body$order: ['complexAll', 'simpleArray', 'complexArray']
    }
  }

  it('generateDefinition', () => {
    let generatedSoapDefinition = XmlExact.generateDefinition(soapXml)
    assert.deepEqual(generatedSoapDefinition, expectedSoapDefinition)
  })
})

describe('XMLUtils#toXML/fromXML object interface', function() {
  const definition = {
    complexAll: {
      xmlBlob$type: 'xml'
    }
  }

  const expectedXml = [
    '<complexAll>',
    '  <xmlBlob>',
    '    <myxml>stuff</myxml>',
    '  </xmlBlob>',
    '</complexAll>'
  ].join('\n')

  const obj = {
    complexAll: {
      xmlBlob: '<myxml>stuff</myxml>'
    }
  }

  let parser = new XmlExact.Parser(definition)

  it('toXml', () => {
    const generatedXml = parser.toXml(obj, 'complexAll', definition)
    assert.strictEqual(generatedXml, expectedXml)
  })
})
