const axios = require('axios')
  .create({
    baseURL: 'https://api.llama.fi',
    timeout: 180000
  })

exports.getProtocols = () => {
  return axios
    .get('/protocols')
    .then(resp => resp.data) // eslint-disable-line
}
