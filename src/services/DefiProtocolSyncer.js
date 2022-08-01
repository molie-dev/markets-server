const defillama = require('../providers/defillama')
const Syncer = require('./Syncer')
const DefiProtocol = require('../db/models/DefiProtocol')
const DefiProtocolTvl = require('../db/models/DefiProtocolTvl')
const Coin = require('../db/models/Coin')
const utils = require('../utils')

class DefiProtocolSyncer extends Syncer {

  async start() {
    await this.syncHistorical()
    await this.syncLatest()
  }

  async syncHistorical(protocols) {
    if (protocols) {
      return this.syncHistoricalTvls(await DefiProtocol.getIds(protocols))
    }

    if (await DefiProtocolTvl.exists()) {
      return
    }

    if (!await DefiProtocol.exists()) {
      try {
        await this.syncProtocols(await this.fetchProtocols())
      } catch (e) {
        console.error(e)
      }
    }

    await this.syncHistoricalTvls(await DefiProtocol.getIds())
  }

  async syncHistoricalTvls(protocols) {
    await DefiProtocolTvl.delete(protocols.map(p => p.id))

    for (let i = 0; i < protocols.length; i += 1) {
      try {
        await this.syncProtocolTvls(protocols[i])
        await utils.sleep(300)
      } catch (e) {
        console.error(e)
      }
    }
  }

  async syncProtocolTvls(defiProtocol) {
    const protocol = await defillama.getProtocol(defiProtocol.defillama_id)
    const tvls = {}

    for (let i = 0; i < protocol.tvl.length; i += 1) {
      const item = protocol.tvl[i]
      const date = new Date(item.date * 1000).setMinutes(0, 0, 0)

      tvls[date] = {
        date,
        defi_protocol_id: defiProtocol.id,
        tvl: item.totalLiquidityUSD,
        chain_tvls: {}
      }
    }

    Object.entries(protocol.chainTvls).forEach(([chain, data]) => {
      for (let i = 0; i < data.tvl.length; i += 1) {
        const item = data.tvl[i]
        const date = new Date(item.date * 1000).setMinutes(0, 0, 0)
        const tvl = tvls[date]
        if (tvl) {
          tvl.chain_tvls[chain] = item.totalLiquidityUSD
        }
      }
    })

    const records = await DefiProtocolTvl.bulkCreate(Object.values(tvls), { ignoreDuplicates: true })
    console.log(`Inserted ${records.length} tvl record for ${defiProtocol.defillama_id}`)
  }

  async syncLatest() {
    this.cron('30m', this.syncDailyStats)
    this.cron('1d', this.syncMonthlyStats)
  }

  async syncDailyStats({ dateTo }) {
    try {
      const protocols = await this.fetchProtocols()
      await this.syncProtocols(protocols, await this.mapTvlsMap())
      await this.syncLatestTvls(protocols, dateTo)
    } catch (e) {
      console.error(e)
    }
  }

  async syncMonthlyStats({ dateFrom, dateTo }) {
    await DefiProtocolTvl.deleteExpired(dateFrom, dateTo)
  }

  async syncLatestTvls(protocols, dateTo) {
    const ids = {}
    const tvls = []
    const defiProtocols = await DefiProtocol.getIds()

    for (let i = 0; i < defiProtocols.length; i += 1) {
      const coin = defiProtocols[i]
      ids[coin.defillama_id] = coin.id
    }

    for (let i = 0; i < protocols.length; i += 1) {
      const protocol = protocols[i]
      const defiCoinId = ids[protocol.slug]

      if (!defiCoinId) {
        continue
      }

      console.log(`Syncing tvl for slug: ${protocol.slug}; gecko_id: ${protocol.gecko_id}`)

      tvls.push({
        defi_protocol_id: defiCoinId,
        date: dateTo,
        tvl: protocol.tvl,
        chain_tvls: protocol.chainTvls
      })
    }

    await DefiProtocolTvl.bulkCreate(tvls, { ignoreDuplicates: true })
  }

  async syncProtocols(protocols, prevTvlMap = {}) {
    const coins = await Coin.findAll({
      attributes: ['id', 'coingecko_id'],
      where: {
        coingecko_id: protocols.map(item => item.gecko_id).filter(id => id)
      }
    })

    const ids = utils.reduceMap(coins, 'coingecko_id', 'id')
    const recordIds = []

    for (let i = 0; i < protocols.length; i += 1) {
      const protocol = protocols[i]
      const coinId = ids[protocol.gecko_id]
      const prevTvl = prevTvlMap[protocol.slug] || {}

      const values = {
        name: protocol.name,
        logo: protocol.logo,
        defillama_id: protocol.slug,
        coingecko_id: protocol.gecko_id,
        tvl: protocol.tvl,
        tvl_rank: i + 1,
        tvl_change: {
          change_1h: protocol.change_1h,
          change_1d: protocol.change_1d,
          change_1w: protocol.change_7d,
          change_2w: utils.percentageChange(prevTvl['2w'], protocol.tvl),
          change_1m: utils.percentageChange(prevTvl['1m'], protocol.tvl),
          change_3m: utils.percentageChange(prevTvl['3m'], protocol.tvl),
          change_6m: utils.percentageChange(prevTvl['6m'], protocol.tvl),
          change_1y: utils.percentageChange(prevTvl['1y'], protocol.tvl)
        },
        chain_tvls: protocol.chainTvls,
        chains: protocol.chains
      }

      if (coinId) {
        values.coin_id = coinId
      }

      const record = await this.upsertProtocol(values)
      recordIds.push(record.id)
    }

    await DefiProtocol.resetRank(recordIds.filter(i => i))
  }

  async upsertProtocol(values) {
    let record = await DefiProtocol.findOne({ where: { defillama_id: values.defillama_id } })
    if (record) {
      console.log(`Updating DefiProtocol; Defillama: ${values.defillama_id}; Coingecko: ${values.coingecko_id}`)
      await record.update(values)
    } else {
      console.log(`Creating DefiProtocol; Defillama: ${values.defillama_id}; Coingecko: ${values.coingecko_id}`)
      record = await DefiProtocol.create(values, { ignoreDuplicates: true })
    }

    return record
  }

  async fetchProtocols() {
    let protocols = []
    try {
      protocols = await defillama.getProtocols()
      console.log(`Fetched new protocols ${protocols.length}`)
    } catch (e) {
      console.log(`Error syncing protocols ${e.message}`)
    }

    return protocols
  }

  async mapTvlsMap() {
    const mapped = {}

    const mapBy = (items, key) => {
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i]
        const map = mapped[item.defillama_id] || (mapped[item.defillama_id] = {})

        map[key] = item.tvl
      }
    }

    const history2w = await DefiProtocolTvl.getListByDate(utils.utcDate({ days: -14 }), '4 hour')
    const history1m = await DefiProtocolTvl.getListByDate(utils.utcDate({ days: -30 }))
    const history3m = await DefiProtocolTvl.getListByDate(utils.utcDate({ days: -90 }))
    const history6m = await DefiProtocolTvl.getListByDate(utils.utcDate({ days: -180 }))
    const history1y = await DefiProtocolTvl.getListByDate(utils.utcDate({ days: -365 }))

    mapBy(history2w, '2w')
    mapBy(history1m, '1m')
    mapBy(history3m, '3m')
    mapBy(history6m, '6m')
    mapBy(history1y, '1y')

    return mapped
  }

}

module.exports = DefiProtocolSyncer
