const utils = require('../../utils')
const Chain = require('../../db/models/Chain')
const serializer = require('./top-chains.serializer')
const ChainMarketCap = require('../../db/models/ChainMarketCap')
const CoinPrice = require('../../db/models/CoinPrice')

exports.index = async ({ currencyRate }, res) => {
  const stats = await Chain.getList()
  res.send(serializer.serialize(stats, currencyRate))
}

exports.protocols = async ({ params, currencyRate }, res) => {
  const stats = await Chain.getPlatforms(params.chain)
  res.send(serializer.serializePlatforms(stats, currencyRate))
}

exports.chart = async ({ params, dateFrom, dateInterval, currencyRate }, res) => {
  const stats = await ChainMarketCap.getByPlatform(params.chain, dateFrom, dateInterval)
  res.send(serializer.serializeChart(stats, currencyRate))
}

exports.marketChart = async ({ params, query, currencyRate }, res) => {
  let { interval, from_timestamp: fromTimestamp } = query
  if (!interval && !query.from_timestamp) {
    interval = '1w'
  }

  if (fromTimestamp) {
    fromTimestamp = parseInt(fromTimestamp, 10)
  } else {
    fromTimestamp = utils.utcDate({ day: -1 }, null, true)
  }

  const stats = await ChainMarketCap.getMarketChart(params.chain, fromTimestamp, interval)
  res.send(serializer.serializeChart(stats, currencyRate))
}

exports.marketChartStart = async ({ params }, res) => {
  const market = await ChainMarketCap.getFirstPoint(params.chain)

  res.send(serializer.serializeFirstPoints(market))
}
