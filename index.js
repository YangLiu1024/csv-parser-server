const express = require('express')
const fs = require('fs')
const path = require('path')
const {convertCSVToSqlite, fetchCSVRows, fetchColumnUniqueValue, removeCSVSqlite} = require('./csv2sqlite')
const bodyParser = require('body-parser')

const app = express()
app.use(bodyParser.json())

app.get('/parse', (req, res) => {
    __checkFilePath(req.query.filePath)
        .then(async fp => {
            const {filePath, offset=0, limit=200} = req.query
            const {sorter={}, filter={}, columns} = req.body
            const items = await fetchCSVRows({filePath, columns, offset, limit, sorter, filter})
            res.set({
                'content-type': 'application/json;charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            })
            res.json(items)
        })
        .catch(err => res.status(500).send(err))
})

app.get('/convert', (req, res) => {
    __checkFilePath(req.query.filePath)
        .then(async fp => {
            const table = await convertCSVToSqlite(filePath)
            res.status(200).send(table)
        })
        .catch(err => res.status(500).send(err))
})

app.get('/unique', (req, res) => {
    const {filePath, filter, columnName} = req.body
    __checkFilePath(filePath)
        .then(async fp => {
            const values = await fetchColumnUniqueValue({filePath, columnName, filter})
            res.set({
                'content-type': 'application/json;charset=utf-8',
                'Access-Control-Allow-Origin': '*'
            })
            res.json(values)
        })
        .catch(err => res.status(500).send(err))
})

app.get('/delete', (req, res) => {
    const {filePath} = req.body
    removeCSVSqlite(filePath).then(() => res.status(200).send('Removed successfully.')).catch(err => res.status(500).send(err))
})

async function __checkFilePath(filePath) {
    let fp = path.resolve(filePath);
    if (!fs.existsSync(fp) || !fs.lstatSync(fp).isFile()) {
        throw new Error(`${filePath} is invalid`)
    }
    return fp
}

app.listen(8080, () => {
    console.log('listen on 8080')
})