const SequelizeModel = require('./SequelizeModel')

class CoinMarket extends SequelizeModel {

  static init(sequelize, DataTypes) {
    return super.init(
      {
        date: {
          type: DataTypes.DATE,
          allowNull: false
        },
        price: {
          type: DataTypes.DECIMAL,
          defaultValue: 0
        },
        volume: {
          type: DataTypes.DECIMAL,
          defaultValue: 0
        }
      },
      {
        sequelize,
        tableName: 'coin_markets',
        indexes: [{
          unique: true,
          fields: ['coin_id', 'date']
        }]
      }
    )
  }

  static associate(models) {
    CoinMarket.belongsTo(models.Coin, {
      foreignKey: 'coin_id'
    })
  }

  static insertMarkets(values) {
    const query = `
      INSERT INTO coin_markets (coin_id, date, price, volume)
      ( SELECT
          c.id,
          v.last_updated_rounded::timestamptz,
          v.price,
         (v.market_data::json ->> 'total_volume')::numeric
        FROM (values :values) as v(uid, price, price_change, market_data, last_updated, last_updated_rounded),
            coins c
        WHERE c.uid = v.uid
      )
      ON CONFLICT (coin_id, date)
      DO UPDATE set price = EXCLUDED.price, volume = EXCLUDED.volume

    `

    return CoinMarket.query(query, { values })
  }

  static async exists() {
    return !!await CoinMarket.findOne()
  }

  static async getPriceChart(uid, window, dateFrom) {
    const query = `
      SELECT
          DISTINCT ON (pc.dt_group)
          pc.date,
          pc.price,
          pc.volume
      FROM
      (
          SELECT
              cm.*,
              ${this.truncateDateWindow('date', window)} AS dt_group
          FROM coin_markets cm, coins c
          WHERE cm.coin_id = c.id AND c.uid = :uid AND cm.date >= :dateFrom
      ) pc
      ORDER BY pc.dt_group, pc.date DESC
    `

    return CoinMarket.query(query, {
      dateFrom,
      uid
    })
  }

  static async getVolumeChart(uid, window, dateFrom) {
    const query = `
      SELECT
          DISTINCT ON (pc.dt_group)
          pc.date,
          pc.volume
      FROM
      (
          SELECT
              cm.date,
              cm.volume,
              ${this.truncateDateWindow('date', window)} AS dt_group
          FROM coin_markets cm, coins c
          WHERE cm.coin_id = c.id AND c.uid = :uid AND cm.date >= :dateFrom
      ) pc
      ORDER BY pc.dt_group, pc.date DESC
`

    return CoinMarket.query(query, {
      dateFrom,
      uid
    })
  }

  static deleteExpired(dateFrom, dateTo) {
    return CoinMarket.query('DELETE FROM coin_markets WHERE date > :dateFrom AND date < :dateTo', {
      dateFrom,
      dateTo
    })
  }

  static getNotSyncedCoins() {
    return CoinMarket.query(`
      SELECT uid
      FROM coins
      WHERE id NOT IN (
        SELECT DISTINCT(coin_id) FROM coin_markets
        WHERE date < (NOW() - INTERVAL '1 HOUR'))`)
  }
}

module.exports = CoinMarket