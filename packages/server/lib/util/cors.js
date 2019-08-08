const _ = require('lodash')
const url = require('url')
const uri = require('./uri')
const debug = require('debug')('cypress:server:cors')
const parseDomain = require('parse-domain')

const ipAddressRe = /^[\d\.]+$/

const _parseDomain = _.partialRight(parseDomain, {
  privateTlds: true,
  customTlds: ipAddressRe,
})

function parseUrlIntoDomainTldPort (str) {
  let { hostname, port, protocol } = url.parse(str)

  if (port == null) {
    port = protocol === 'https:' ? '443' : '80'
  }

  let parsed = _parseDomain(hostname)

  // if we couldn't get a parsed domain
  if (!parsed) {
    // then just fall back to a dumb check
    // based on assumptions that the tld
    // is the last segment after the final
    // '.' and that the domain is the segment
    // before that
    const segments = hostname.split('.')

    parsed = {
      tld: segments[segments.length - 1] || '',
      domain: segments[segments.length - 2] || '',
    }
  }

  const obj = {}

  obj.port = port
  obj.tld = parsed.tld
  obj.domain = parsed.domain
  // obj.protocol = protocol

  debug('Parsed URL %o', obj)

  return obj
}

module.exports = {
  parseUrlIntoDomainTldPort,

  parseDomain: _parseDomain,

  // matches #getSuperDomain from driver
  // https://github.com/cypress-io/cypress/blob/adb56d0f79d0378840cd7b2011862f7792cfe992/packages/driver/src/cypress/location.coffee#L85-L85
  getSuperDomain (url) {
    const parsed = parseUrlIntoDomainTldPort(url)

    return _.compact([parsed.domain, parsed.tld]).join('.')
  },

  urlMatchesOriginPolicyProps (urlStr, props) {
    // take a shortcut here in the case
    // where remoteHostAndPort is null
    if (!props) {
      return false
    }

    const parsedUrl = this.parseUrlIntoDomainTldPort(urlStr)

    // does the parsedUrl match the parsedHost?
    return _.isEqual(parsedUrl, props)
  },

  urlMatchesOriginProtectionSpace (urlStr, origin) {
    const normalizedUrl = uri.addDefaultPort(urlStr).format()
    const normalizedOrigin = uri.addDefaultPort(origin).format()

    return _.startsWith(normalizedUrl, normalizedOrigin)
  },
}
