const co = require('co').wrap
const { TYPE, SIG } = require('@tradle/constants')
const { parseStub } = require('@tradle/validate-resource').utils
const APPLICATION_STATUS_TYPES = [
  'tradle.Confirmation',
  'tradle.ApplicationSubmitted',
  'tradle.ApplicationApproval',
  'tradle.ApplicationDenial'
]

module.exports = function customizeMessage ({ models, conf, getConf, logger }) {

  const willSend = co(function* ({ to, application, object }) {
    if (!object  ||  object[SIG]) return

    if (getConf) {
      conf = yield getConf()
      if (!conf) return
    }

    const appSpecific = application && conf[application.requestFor]
    const props = {
      object,
      application,
      models,
      messages: appSpecific
    }

    let message
    if (appSpecific) {
      message = getMessage(props)
    }

    if (!message) {
      props.messages = conf
      message = getMessage(props)
    }

    if (message) {
      logger.debug(`updated message on ${object[TYPE]}`)
      object.message = message
    }
  })

  function getMessage ({ object, application, messages }) {
    const type = object[TYPE]
    let message = messages[type]
    if (typeof message === 'undefined') return

    const { form } = object
    if (message && typeof message === 'object') {
      if (type === 'tradle.FormRequest' || type === 'tradle.FormError') {
        message = message[form]
        if (message && typeof message === 'object') {
          if (!application) return

          const productModel = models[application.requestFor]
          const { multiEntryForms } = productModel
          if (!(multiEntryForms && multiEntryForms.includes(form))) return

          const { forms } = application
          const isNth = forms.some(stub => parseStub(stub).type === form)
          message = isNth ? message.nth : message.first
        }
      } else if (APPLICATION_STATUS_TYPES.includes(type)) {
        const requestFor = application && application.requestFor
        message = requestFor && message[requestFor]
      }
    }

    if (message && typeof message === 'object') {
      logger.error(`failed to resolve message for type: ${type}`)
    }

    return message
  }

  return {
    willSend
  }
}

