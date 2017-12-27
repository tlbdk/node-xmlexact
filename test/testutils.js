'use strict'

const dedent = xml => {
  let indent = 100
  const indents = xml.match(/(?:^|\n)(\s+)/g)
  if (indents) {
    for (const i of indents) {
      indent = Math.min(indent, i.replace('\n', '').length)
    }
  }
  const regex = new RegExp('(?:^\\s+)|(?:(\\n)\\s{' + indent + '})', 'g')
  return xml.replace(regex, '$1')
}

module.exports = { dedent }
