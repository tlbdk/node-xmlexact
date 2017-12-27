/*eslint-env node, mocha */

const expect = require('unexpected')
const { toXml } = require('../src/toxml')
const { dedent } = require('./testutils')

describe.only('toXml', () => {
  it('root (string, int, bool, float, empty string, null, undefined)', () => {
    for (let val of ['string', 1, true, 1.1, '', null, undefined, null]) {
      let obj = {
        root: val
      }
      let xml = toXml(obj, 'root', null, { optimizeEmpty: false })
      expect(xml, 'to equal', `<root>${val ? val : ''}</root>`)
    }
  })
  it('inline value(string, int, bool, float, empty string, null, undefined)', () => {
    for (let val of ['string', 1, true, 1.1, '', null, undefined, null]) {
      let obj = {
        root: {
          $: val
        }
      }
      let xml = toXml(obj, 'root', null, { optimizeEmpty: false })
      expect(xml, 'to equal', `<root>${val ? val : ''}</root>`)
    }
  })
  it('ns by object', () => {
    let obj = {
      'ns:root': ''
    }
    let xml = toXml(obj, 'ns:root', null, { optimizeEmpty: false })
    expect(xml, 'to equal', `<ns:root></ns:root>`)
  })
  it('ns by definition', () => {
    let obj = {
      root: ''
    }
    let definition = {
      root$namespace: 'ns'
    }
    let xml = toXml(obj, 'root', definition, { optimizeEmpty: false })
    expect(xml, 'to equal', `<ns:root></ns:root>`)
  })
  it('attribute by object(string, int, bool, float, empty string, null, undefined)', () => {
    for (let val of ['string', 1, true, 1.1, '', null, undefined, null]) {
      let obj = {
        root: {
          $attrib1: val
        }
      }
      let xml = toXml(obj, 'root', null, { optimizeEmpty: false })
      expect(xml, 'to equal', `<root attrib1="${val ? val : ''}"></root>`)
    }
  })
  it('attribute by definition(empty string, null, undefined)', () => {
    for (let val of ['string', 1, true, 1.1, '', null, undefined, null]) {
      let obj = {
        root: ''
      }
      let definition = {
        root$attributes: {
          attrib1: val
        }
      }
      let xml = toXml(obj, 'root', definition, { optimizeEmpty: false })
      expect(xml, 'to equal', `<root attrib1="${val ? val : ''}"></root>`)
    }
  })
})

describe.only('toXml extend', () => {
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
      nullableInt$type: 'int?',
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
      nullableInt: null,
      intWithDefinedAttribute: 1
    }
  }

  const expectedXml = [
    '<complexAll boolean1="true" boolean2="false" float="1.1" int="1">',
    '<boolean1>true</boolean1>',
    '<boolean2>false</boolean2>',
    '<float>1.1</float>',
    '<int>1</int>',
    '<intWithAttribute test="hello">1</intWithAttribute>',
    '<intWithDefinedAttribute test="hello">1</intWithDefinedAttribute>',
    '<nullableInt></nullableInt>',
    '</complexAll>'
  ].join('')

  it('to', () => {
    let xml = toXml(obj, 'complexAll', definition, { optimizeEmpty: false })
    expect(xml, 'to equal', expectedXml)
  })
})
