// @ts-check
'use strict'

const ValidationError = require('./validationerror')

function toXml(obj, rootName, definition = {}, options = {}) {
  let value = obj[rootName]
  return _toXml(rootName, value, definition, options)
}

function _toXml(key, value, definition, options, level = 0) {
  definition = definition ? definition : {}

  let xmlResult = ''

  // Look up xmlType and length for key
  let type = getType(value)
  let xmlType = null
  let length = [-1, -1]
  if (type === 'object') {
    xmlType = value[key + '$type'] || definition[key + '$type']
    length = value[key + '$length'] || definition[key + '$length']
  } else {
    xmlType = definition[key + '$type']
    length = definition[key + '$length']
  }

  // Array is at same level as current
  if (type === 'array') {
    if (options.validation) validateXmlType(value, xmlType, length)
    for (let itemValue of value) {
      xmlResult += _toXml(key, itemValue, definition, options, level)
    }
    return xmlResult
  } else if (getType(xmlType) === 'array' && options.validation) {
    throw new ValidationError(
      `Expected ${key} to be of type array found ${type}`
    )
  }

  // Copy over defined attributes
  let attributes = {}
  let definitionAttributes = definition[key + '$attributes'] || {}
  for (let attributeName of Object.keys(definitionAttributes)) {
    if (attributeName.indexOf('$') !== -1) continue // Skip type definitions
    let attributeValue = definitionAttributes[attributeName]
    let attributeType = definitionAttributes[attributeName + '$type']
    if (options.validation) {
      validateXmlType(attributeValue, xmlType, length)
    }
    attributes[attributeName] = _formatXmlOutput(
      attributeValue,
      attributeType,
      options,
      level
    )
  }

  // Get defined namespace
  let namespace = definition[key + '$namespace'] || ''

  // Build XML
  if (type === 'object') {
    let prefix = ''
    let postfix = ''
    let subResult = ''
    let order = value[key + '$order'] || definition[key + '$order']
    for (let objectKey of sortByList(Object.keys(value), order)) {
      if (objectKey === '$') {
        let objectValue = value[objectKey]
        if (options.validation) {
          validateXmlType(objectValue, xmlType, length)
        }
        prefix += _formatXmlOutput(objectValue, xmlType, options, level)
      } else if (objectKey === '$$') {
        let objectValue = value[objectKey]
        if (options.validation) {
          validateXmlType(objectValue, xmlType, length)
        }
        postfix += _formatXmlOutput(objectValue, xmlType, options, level)
      } else if (options.validation && xmlType) {
        // TODO(Error): does not have $ or $$ set but has xmlType
      } else if (objectKey === 'namespace$') {
        namespace = value[objectKey]
      } else if (objectKey.indexOf('$') === 0) {
        // Support inline attributes
        let attributeValue = value[objectKey]
        let attributeType = definitionAttributes[objectKey.substr(1) + '$type']
        if (options.validation) {
          validateXmlType(attributeValue, xmlType, length)
        }
        attributes[objectKey.substr(1)] = _formatXmlOutput(
          attributeValue,
          attributeType,
          options,
          level
        )
      } else if (objectKey.indexOf('$') > 0) {
        // Skip definition information such as order
      } else {
        subResult += _toXml(
          objectKey,
          value[objectKey],
          definition[key],
          options,
          level + 1
        )
      }
    }
    xmlResult += generateXml(
      namespace ? `${namespace}:${key.replace(/^.+?:/, '')}` : key,
      attributes,
      subResult === '' ? prefix + postfix : `\n${prefix}${subResult}${postfix}`,
      level * options.indentation,
      options
    )
  } else {
    if (options.validation) {
      validateXmlType(value, xmlType, length)
    }
    xmlResult += generateXml(
      namespace ? `${namespace}:${key.replace(/^.+?:/, '')}` : key,
      attributes,
      _formatXmlOutput(value, xmlType, options, level),
      level * options.indentation,
      options
    )
  }
  return xmlResult
}

function generateXml(elementName, attributes, value, indentation, options) {
  let whitespace = ' '.repeat(indentation)
  let result = ''

  // Write <xml attrib=...>
  // Attributes are unordered, but we sort here so it's easer to test the output
  result += whitespace + '<' + elementName
  for (let key of Object.keys(attributes).sort()) {
    result += ' ' + key + '="' + attributes[key] + '"'
  }

  if (value === '' && options.optimizeEmpty) {
    // <xml />
    result += ` />${indentation ? '\n' : ''}`
  } else {
    // ...</xml>
    result += `>${value}`
    result +=
      typeof value === 'string' && value.indexOf('\n') >= 0 ? whitespace : ''
    result += `</${elementName}>${indentation ? '\n' : ''}`
  }

  return result
}

function sortByList(list, order) {
  if (!order || order.length == 0) {
    return list
  }

  return list.sort((a, b) => {
    let aOffset = order.indexOf(a)
    let bOffset = order.indexOf(b)
    if (aOffset == -1 && bOffset > 0) {
      return 1
    }
    if (bOffset == -1 && aOffset > 0) {
      return -1
    }
    return aOffset - bOffset
  })
}

function validateXmlType(value, xmlType, length) {
  let type = getType(value)
  if (type === 'array') {
  }

  console.log('')
  // TODO: Validate type and length
}

function getType(val) {
  if (val === undefined) {
    return 'undefined'
  } else if (val === null) {
    return 'null'
  } else if (Array.isArray(val)) {
    return 'array'
  } else if (
    !!val.constructor &&
    typeof val.constructor.isBuffer === 'function' &&
    val.constructor.isBuffer(val)
  ) {
    return 'buffer'
  } else {
    return typeof val
  }
}

function _formatXmlOutput(value, xmlType, options, level = 0) {
  if (value === undefined || value === null) {
    return ''
  }
  if (options.convertTypes !== true) {
    return value
  }

  if (Array.isArray(xmlType)) {
    xmlType = xmlType[0]
  }

  if (xmlType === 'xml') {
    let whitespace = ' '.repeat(options.indentation * (level + 1))
    return `\n${whitespace}${value.replace(/\n/g, `\n${whitespace}`)}\n`
  } else if (xmlType === 'base64Binary') {
    return Buffer.from(value).toString('base64')
  } else if (xmlType === 'hexBinary') {
    return Buffer.from(value).toString('hex')
  } else {
    return xmlEscapeValue(value)
  }
}

function xmlEscapeValue(value) {
  // https://stackoverflow.com/questions/1091945/what-characters-do-i-need-to-escape-in-xml-documents/1091953
  if (typeof value === 'string') {
    return value.replace(
      /((?:&(?!(?:apos|quot|[gl]t|amp);))|(?:^<!\[CDATA\[.+?\]\]>)|[<>'"])/g,
      function(match, p1) {
        switch (p1) {
          case '>':
            return '&gt;'
          case '<':
            return '&lt;'
          case "'":
            return '&apos;'
          case '"':
            return '&quot;'
          case '&':
            return '&amp;'
          default:
            return p1
        }
      }
    )
  } else {
    return value
  }
}

module.exports = toXml
