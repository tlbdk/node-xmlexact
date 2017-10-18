/*eslint-env node, mocha */

const assert = require('chai').assert
const xmlExact = require('../src/xmlexact')

describe('Validation', () => {
  const definition = {
    complexAll: {
      boolean$type: 'boolean',
      float$type: 'float',
      int$type: 'int',
      string$type: 'string',
      string$length: [2, 10],
      stringArray$type: ['string', 2, 2],
      stringArray$length: [2, 2]
    }
  }

  const validObj1 = {
    complexAll: {
      boolean: true,
      float: 1.1,
      int: 1,
      string: '  ',
      stringArray: ['  ', '  ']
    },
    complexAll$order: ['boolean1', 'boolean2', 'float', 'int']
  }

  it('toXml', () => {
    let generatedXml = xmlExact.toXml(validObj1, 'complexAll', definition, {
      validation: true
    })
    assert.isNotNull(generatedXml)
  })

  it('string array too large', () => {
    const invalidObj = {
      complexAll: {
        stringArray: ['  ', '  ', '  ']
      }
    }

    try {
      let generatedXml = xmlExact.toXml(invalidObj, 'complexAll', definition, {
        validation: true
      })
    } catch (error) {
      assert.isNotNull(error)
      assert.match(error, /should be larger/)
      return
    }
    assert.fail('Should throw exception with errors')
  })

  it('string array too small', () => {
    const invalidObj = {
      complexAll: {
        stringArray: ['  ']
      }
    }

    try {
      let generatedXml = xmlExact.toXml(invalidObj, 'complexAll', definition, {
        validation: true
      })
    } catch (errors) {
      assert.isNotNull(errors)
      return
    }
    assert.fail('Should throw exception with errors')
  })
})
