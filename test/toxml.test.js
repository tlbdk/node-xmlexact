/*eslint-env node, mocha */

const expect = require('unexpected')
const { toXml } = require('../src/toxml')
const { dedent } = require('./testutils')

describe('toXml root only', () => {
  it('null/undefined/empty', () => {
    for (let val of [null, undefined, null]) {
      let obj = {
        root: val
      }
      let xml = toXml(obj, 'root')
      expect(xml, 'to equal', `<root></root>`)
    }
  })
  it('ns by object', () => {
    let obj = {
      'ns:root': ''
    }
    expect(toXml(obj, 'ns:root'), 'to equal', `<ns:root></ns:root>`)
  })
  it('ns by definition', () => {
    let obj = {
      root: ''
    }
    let definition = {
      root$namespace: 'ns'
    }
    expect(toXml(obj, 'root', definition), 'to equal', `<ns:root></ns:root>`)
  })
  it('attribute by object', () => {
    let obj = {
      root: {
        $attrib1: ''
      }
    }
    expect(toXml(obj, 'root'), 'to equal', `<root attrib1=""></root>`)
  })
  it('attribute by definition', () => {
    let obj = {
      root: ''
    }
    let definition = {
      root$attributes: {
        attrib1: ''
      }
    }
    expect(
      toXml(obj, 'root', definition),
      'to equal',
      `<root attrib1=""></root>`
    )
  })
  it('attribute by definition', () => {
    let obj = {
      root: ''
    }
    let definition = {
      root$attributes: {
        attrib1: '',
        attrib1$type: 'string'
      }
    }
    expect(
      toXml(obj, 'root', definition),
      'to equal',
      `<root attrib1=""></root>`
    )
  })
})

describe('toXml root only', () => {
  it('null/undefined/empty', () => {
    for (let val of [null, undefined, null]) {
      let obj = {
        root: val
      }
      let xml = toXml(obj, 'root')
      expect(xml, 'to equal', `<root></root>`)
    }
  })
})
