const Sequelize = require('sequelize')

class SequelizeModel extends Sequelize.Model {
  static query(sql, type = Sequelize.QueryTypes.SELECT) {
    return this.sequelize.query(sql, { type })
  }

  static truncateDateWindow(field, window = '1h') {
    switch (window) {
      case '1h':
        return `DATE_TRUNC('hour', ${field})`
      case '4h':
        return `(date_trunc('hour', (${field} - timestamptz 'epoch') / 4) * 4 + timestamptz 'epoch')`
      case '1d':
        return `DATE_TRUNC('day', ${field})`
      default:
        return field
    }
  }
}

module.exports = SequelizeModel