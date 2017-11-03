const co = require('co').wrap
const test = require('tape')
const { TYPE, SIG } = require('@tradle/constants')
const buildResource = require('@tradle/build-resource')
const TEST_PRODUCT = {
  id: 'test.TestProduct',
  title: 'test product',
  type: 'tradle.Model',
  subClassOf: 'tradle.FinancialProduct',
  interfaces: [
    'tradle.Message'
  ],
  forms: [
    'tradle.PhotoID',
    'tradle.Residence'
  ],
  multiEntryForms: [
    'tradle.Residence'
  ],
  properties: {}
}

const models = require('@tradle/merge-models')()
  .add(require('@tradle/models').models)
  .add(require('@tradle/custom-models'))
  .add([TEST_PRODUCT])
  .get()

const sampleConf = {
  "tradle.FormRequest": {
    "tradle.PhotoID": "Please click to scan your **ID document**",
    "tradle.Selfie": "Thank you. Now take a '**selfie**' photo of yourself that I can match against your ID document",
    "tradle.Residence": {
      "first": "Thank you. Now I need you to provide your **residence** information",
      "nth": "Thank you. Do you have another **residence**? If yes, tap Add, otherwise tap Next"
    }
  },
  "tradle.ApplicationSubmitted": {
    [TEST_PRODUCT.id]: "Your application for a Test Product has been submitted!"
  },
  "tradle.ApplicationApproval": {
    [TEST_PRODUCT.id]: "Your application for a Test Product has been approved!"
  }
}

const createPlugin = require('./')
const logger = {
  debug: console.log.bind(console)
}

test('basic', co(function* (t) {
  const plugin = createPlugin({
    conf: sampleConf,
    logger
  })

  const bot = {
    models: {
      all: models
    }
  }

  const application = {
    requestFor: TEST_PRODUCT.id,
    forms: []
  }

  const req = {
    application
  }

  const photoIdReq = {
    [TYPE]: 'tradle.FormRequest',
    [SIG]: 'abc',
    form: 'tradle.PhotoID'
  }

  yield plugin.willSend.call(bot, {
    req,
    object: photoIdReq
  })

  t.equal(photoIdReq.message, sampleConf['tradle.FormRequest']['tradle.PhotoID'])
  application.forms.push(fakeStub('tradle.PhotoID'))

  const firstResidenceReq = {
    [TYPE]: 'tradle.FormRequest',
    [SIG]: 'abc',
    form: 'tradle.Residence'
  }

  yield plugin.willSend.call(bot, {
    req,
    object: firstResidenceReq
  })

  application.forms.push(fakeStub('tradle.Residence'))

  t.equal(firstResidenceReq.message, sampleConf['tradle.FormRequest']['tradle.Residence'].first)

  const secondResidenceReq = {
    [TYPE]: 'tradle.FormRequest',
    [SIG]: 'abc',
    form: 'tradle.Residence'
  }

  yield plugin.willSend.call(bot, {
    req,
    object: secondResidenceReq
  })

  t.equal(secondResidenceReq.message, sampleConf['tradle.FormRequest']['tradle.Residence'].nth)
  application.forms.push(fakeStub('tradle.Residence'))

  const approval = {
    [TYPE]: 'tradle.ApplicationApproval',
    [SIG]: 'abc'
  }

  yield plugin.willSend.call(bot, {
    req,
    object: approval
  })

  t.equal(approval.message, sampleConf['tradle.ApplicationApproval'][TEST_PRODUCT.id])
  t.end()
}))

function fakeStub (type) {
  return {
    id: `${type}_abc_123`
  }
}
