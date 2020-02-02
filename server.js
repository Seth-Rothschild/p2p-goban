const express = require('express')
const path = require('path')

const app = express()

app.get('/', function(req, res) {
    res.sendFile(path.join(__dirname, 'index.html'))
})
app.use(express.static(__dirname))

app.listen(process.env.PORT || 3000, ()=> {console.log('Listening on 3000')})
module.exports = app