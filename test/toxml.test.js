/*eslint-env node, mocha */

const expect = require('unexpected')
const toXml = require('../src/toxml')
const { dedent } = require('./testutils')

describe('toXml', () => {
  it('root (string, int, bool, float, empty string, null, undefined)', () => {
    for (let val of ['string', 1, true, 1.1, '', null, undefined, null]) {
      let obj = {
        root: val
      }
      let xml = toXml(obj, 'root', null, {
        optimizeEmpty: false,
        convertTypes: true
      })
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
      let xml = toXml(obj, 'root', null, {
        optimizeEmpty: false,
        convertTypes: true
      })
      expect(xml, 'to equal', `<root>${val ? val : ''}</root>`)
    }
  })
  it('ns by object', () => {
    let obj = {
      'ns:root': ''
    }
    let xml = toXml(obj, 'ns:root', null, {
      optimizeEmpty: false,
      convertTypes: true
    })
    expect(xml, 'to equal', `<ns:root></ns:root>`)
  })
  it('ns by definition', () => {
    let obj = {
      root: ''
    }
    let definition = {
      root$namespace: 'ns'
    }
    let xml = toXml(obj, 'root', definition, {
      optimizeEmpty: false,
      convertTypes: true
    })
    expect(xml, 'to equal', `<ns:root></ns:root>`)
  })
  it('attribute by object(string, int, bool, float, empty string, null, undefined)', () => {
    for (let val of ['string', 1, true, 1.1, '', null, undefined, null]) {
      let obj = {
        root: {
          $attrib1: val
        }
      }
      let xml = toXml(obj, 'root', null, {
        optimizeEmpty: false,
        convertTypes: true
      })
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
      let xml = toXml(obj, 'root', definition, {
        optimizeEmpty: false,
        convertTypes: true
      })
      expect(xml, 'to equal', `<root attrib1="${val ? val : ''}"></root>`)
    }
  })
  it('xml indentation', () => {
    let definition = {
      root: {
        xml$type: 'xml'
      }
    }

    let obj = {
      root: {
        xml: dedent(`
          <nested>
            <val>1</val>
          </nested>`)
      }
    }

    let expectedXml = dedent(`
    <root>
      <xml>
        <nested>
          <val>1</val>
        </nested>
      </xml>
    </root>`)

    let generatedXml = toXml(obj, 'root', definition, {
      optimizeEmpty: false,
      indentation: 2,
      convertTypes: true
    })
    expect(generatedXml, 'to equal', expectedXml)
  })
  it('escaped xml indentation', () => {
    let obj = {
      root: {
        xml: dedent(`
          <nested>
            <val>1</val>
          </nested>`)
      }
    }

    let expectedXml = [
      '<root>',
      '  <xml>&lt;nested&gt;',
      '  &lt;val&gt;1&lt;/val&gt;',
      '&lt;/nested&gt;</xml>',
      '</root>'
    ].join('\n')

    let generatedXml = toXml(obj, 'root', null, {
      optimizeEmpty: false,
      indentation: 2,
      convertTypes: true
    })
    expect(generatedXml, 'to equal', expectedXml)
  })
})
