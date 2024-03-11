const mongo = require('../../db/mongo')
const serializer = require('./stats.serializer')

exports.popularCoins = async (req, res) => {
  const coins = await mongo.getStats('coin_stats')
  res.send(serializer.serializeCoins(coins))
}

exports.popularResources = async (req, res) => {
  const resources = await mongo.getStats('resource_stats')
  res.send(serializer.serializeResources(resources))
}

exports.analytics = async ({ query }, res) => {
  const stats = {
    tag: query.tag_name,
  }

  if (query.tag_type) stats.type = query.tag_type
  if (query.tag_parent) stats.parent = query.tag_parent
  if (query.tag_from) stats.from = query.tag_from

  // indicators
  if (query.ma) stats.ma = query.ma
  if (query.oscillators) stats.oscillators = query.oscillators

  // coins
  if (query.coin_uid) stats.coin_uid = query.coin_uid

  try {
    await mongo.storeStats(stats)
  } catch (e) {
    console.log(e.message)
  }

  res.end()
}

exports.logs = async () => {
  await mongo.storeStats({
    tag_name: 'market',
    tag_type: 'page_view',
  })

  await mongo.storeStats({
    tag_name: 'coin_page',
    tag_type: 'page_view',
    tag_parent: 'market',
  })

  await mongo.storeStats({
    tag_name: 'enable_coin',
    tag_type: 'click_add_button',
    tag_parent: 'coin_page',
    coin_uid: 'uniswap'
  })

  await mongo.storeStats({
    tag_name: 'indicators',
    tag_type: 'page_view',
    tag_parent: 'coin_page',
  })

  await mongo.storeStats({
    tag_name: 'indicators_settings',
    tag_parent: 'indicators',
    tag_data: {
      moving_averages: ['ma1'],
      oscillators: []
    },
  })

  await mongo.storeStats({
    tag_name: 'indicators',
    tag_type: 'page_view',
    tag_parent: 'coin_page',
    event_name: 'featured_product_click',
    event_data: {
      button_id: 'btn_featured_product',
      filter_type: 'price',
      filter_value: '$100 - $200'
    }
  })

  const data = {
    page_name: 'homepage',                // Name or identifier of the page
    page_category: 'landing',             // Category of the page (optional)
    event_type: 'page_view',              // Type of event: page_view, button_click, filter_chosen, etc.
    event_name: 'featured_product_click', // Name or identifier of the event (optional)
    event_data: {                         // Additional data related to the event (optional)
      button_id: 'btn_featured_product',
      filter_type: 'price',
      filter_value: '$100 - $200'
    }
  }
}
