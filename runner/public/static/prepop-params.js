;(function (global) {
  'use strict'

  // Keep in sync with timeoutPreservedParamKeys in runner/src/server/plugins/engine/helpers.ts
  var KEYS = ['r', 'd']
  var STORAGE_PREFIX = 'prepopParams:'
  var ATTEMPT_PREFIX = 'prepopRestoreAttempted:'

  var el = document.getElementById('prepop-params')
  var formId = el ? el.getAttribute('data-form-id') : ''

  function attempt (fn, fallback) {
    try {
      return fn()
    } catch (e) {
      return fallback
    }
  }

  // Only r and d, as non-empty strings. The server validates the values.
  function pick (source) {
    var params = {}

    if (source && typeof source === 'object') {
      KEYS.forEach(function (key) {
        var value = source[key]
        if (typeof value === 'string' && value.length > 0) {
          params[key] = value
        }
      })
    }
    return params
  }

  function hasParams (params) {
    return Object.keys(params).length > 0
  }

  function toQueryString (params) {
    return KEYS.filter(function (key) {
      return params[key]
    }).map(function (key) {
      return encodeURIComponent(key) + '=' + encodeURIComponent(params[key])
    }).join('&')
  }

  function read () {
    return attempt(function () {
      return pick(JSON.parse(global.sessionStorage.getItem(STORAGE_PREFIX + formId)))
    }, {})
  }

  function write (params) {
    attempt(function () {
      global.sessionStorage.setItem(STORAGE_PREFIX + formId, JSON.stringify(params))
    })
  }

  function remove () {
    attempt(function () {
      global.sessionStorage.removeItem(STORAGE_PREFIX + formId)
    })
  }

  function wasRestoreAttempted () {
    return attempt(function () {
      return global.sessionStorage.getItem(ATTEMPT_PREFIX + formId) === 'true'
    }, false)
  }

  function setRestoreAttempted (attempted) {
    attempt(function () {
      if (attempted) {
        global.sessionStorage.setItem(ATTEMPT_PREFIX + formId, 'true')
      } else {
        global.sessionStorage.removeItem(ATTEMPT_PREFIX + formId)
      }
    })
  }

  function normalisePath (path) {
    return (path || '').replace(/\/+$/, '')
  }

  function isStartPage () {
    var startPath = el.getAttribute('data-start-path')
    return !!startPath && normalisePath(startPath) === normalisePath(global.location.pathname)
  }

  function init () {
    if (!formId) {
      return
    }

    // Timeout and confirmation pages: the params are no longer needed in the browser
    if (el.getAttribute('data-clear') === 'true') {
      remove()
      setRestoreAttempted(false)
      return
    }

    var serverParams = pick(attempt(function () {
      return JSON.parse(el.getAttribute('data-params'))
    }, {}))

    if (hasParams(serverParams)) {
      write(serverParams)
      setRestoreAttempted(false)
      return
    }

    // The session no longer has the params (e.g. it expired and the page was reloaded)
    var stored = read()

    if (!hasParams(stored)) {
      return
    }

    if (wasRestoreAttempted()) {
      // The server did not accept the stored values, so do not try again
      remove()
      setRestoreAttempted(false)
    } else if (isStartPage()) {
      setRestoreAttempted(true)
      global.location.replace('/' + encodeURIComponent(formId) + '?' + toQueryString(stored))
    }
  }

  global.PrePopParams = {
    queryString: function () {
      return formId ? toQueryString(read()) : ''
    }
  }

  init()
})(window); // eslint-disable-line semi
