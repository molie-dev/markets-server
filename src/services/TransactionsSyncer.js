const cron = require('node-cron')
const Transaction = require('../db/models/Transaction')
const bigquery = require('../db/bigquery')

class TransactionsSyncer {

  interval = '*/30 * * * *' // every 30 mins
  initialSyncDate = '2021-09-01'

  async start() {
    const lastSyncDate = await this.getLastSyncDate()

    // This fetch is unnecessary for the app restart
    if (!this.isSameDay(lastSyncDate)) {
      await this.fetchAndSave(lastSyncDate)
    }

    // Schedule cron task
    cron.schedule(this.interval, this.sync, {})
  }

  async sync() {
    const lastSyncDate = await this.getLastSyncDate()
    await this.fetchAndSave(lastSyncDate)
  }

  async fetchAndSave(fromDate) {
    const transactions = await bigquery.getTransactions(fromDate)

    await Transaction.bulkCreate(transactions, {
      updateOnDuplicate: ['count', 'volume']
    })
  }

  async getLastSyncDate() {
    const transaction = await Transaction.getLast()
    return transaction ? transaction.date : this.initialSyncDate
  }

  isSameDay(dateStr) {
    const today = new Date().toISOString()
    const todayStr = today.substring(0, 10) // YYYY-MM-DD
    return dateStr === todayStr
  }

}

module.exports = TransactionsSyncer
