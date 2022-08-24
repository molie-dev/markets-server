const { create } = require('axios')
const { stringify } = require('querystring')

const web = create({ baseURL: 'https://polygonscan.com/', timeout: 180000 })
const api = create({ baseURL: 'https://api.polygonscan.com/api', timeout: 180000 })

exports.getHolders = address => {
  return web.get(`/token/tokenholderchart/${address}?range=10`).then(res => res.data)
}

exports.getAccounts = () => {
  return web.get('/accounts').then(res => res.data)
}

exports.getTokenSupply = address => {
  const params = {
    module: 'stats',
    action: 'tokensupply',
    contractaddress: address,
    apikey: process.env.POLYGONSCAN_KEY
  }

  console.log(`Fetching circulating supply for ${address} from polygonscan`)

  return api.get(`?${stringify(params)}`)
    .then(res => res.data)
    .then(res => (res || {}).result)
    .catch(e => {
      console.log(e)
      return 0
    })
}