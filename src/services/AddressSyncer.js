const { CronJob } = require('cron')
const { isSameDay } = require('../utils')
const Address = require('../db/models/Address')
const bigquery = require('../db/bigquery')

class AddressSyncer {

  constructor() {
    this.initialSyncDate = '2021-09-01'
    this.cronJob = new CronJob({
      cronTime: '* */2 * * *', // every 2 hours
      onTick: this.sync.bind(this),
      start: false
    })
  }

  async start() {
    const lastSyncDate = await this.getLastSyncDate()

    // This fetch is unnecessary for the app restart
    if (!isSameDay(lastSyncDate)) {
      await this.fetchAndSave(lastSyncDate)
    }

    // Schedule cron task
    this.cronJob.start()
  }

  async sync() {
    const lastSyncDate = await this.getLastSyncDate()
    await this.fetchAndSave(lastSyncDate)
  }

  async fetchAndSave(fromDate) {
    const addresses = await bigquery.getAddresses(fromDate)

    await Address.bulkCreate(addresses, {
      updateOnDuplicate: ['count']
    })
  }

  async getLastSyncDate() {
    const address = await Address.getLast()
    return address ? address.date : new Date(this.initialSyncDate)
  }

}

module.exports = AddressSyncer
