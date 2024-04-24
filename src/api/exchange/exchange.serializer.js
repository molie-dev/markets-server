const { valueInCurrency, nullOrString } = require('../../utils')

exports.serialize = exchanges => {
  return exchanges.map(item => {
    return {
      uid: item.uid,
      name: item.name
    }
  })
}

exports.serializeWhitelist = exchanges => {
  return exchanges.map(item => item.uid)
}

exports.serializeTopPairs = (markets, currencyRate) => {
  return markets.map((item, index) => {
    return {
      rank: index + 1,
      base: item.base,
      target: item.target,
      price: nullOrString(item.price),
      volume: valueInCurrency(item.volume_usd, currencyRate),
      market_name: item.market_name,
      market_logo: item.market_logo,
      trade_url: item.trade_url
    }
  })
}

exports.serializeTickers = (exchanges, whitelist, currencyRate) => {
  return exchanges.map(item => {
    return {
      base: item.base,
      target: item.target,
      volume: item.volume,
      volume_in_currency: valueInCurrency(item.volume_usd, currencyRate),
      market_uid: item.market_uid,
      market_name: item.market_name,
      market_logo: item.market_logo,
      trade_url: item.trade_url,
      whitelisted: !!whitelist[item.market_uid]
    }
  })
}
