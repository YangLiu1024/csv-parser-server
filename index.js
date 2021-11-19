const { parse, count } = require('./papa-parser')
const express = require('express')
const app = express()
const fs = require('fs')
const path = require('path')

app.get('/parse', (req, res) => {
    let filePath = req.query.filePath
    let fp = path.resolve(filePath);
    if (!fs.existsSync(fp) || !fs.lstatSync(fp).isFile()) {
        res.status(500).send('invalid file path: ' + filePath)
    }
    parse(fs.createReadStream(fp), {
        startIndex: req.query.startIndex,
        stopIndex: req.query.stopIndex
    }).then(items => {
        res.set({
            'content-type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        })
        res.json(items)
    }).catch(err => {
        res.status(500).send(err)
    })
})

app.get('/count', (req, res) => {
    let filePath = req.query.filePath
    let fp = path.resolve(filePath);
    if (!fs.existsSync(fp) || !fs.lstatSync(fp).isFile()) {
        res.status(500).send('invalid file path: ' + filePath)
    }
    count(fs.createReadStream(fp))
    .then(c => {
        res.set({
            'content-type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        })
        res.status(200).json(c)
    }).catch(err => {
        console.log(err)
        res.status(500).send(err)
    })
})

app.get('/download', (req, res) => {
    res.download('./badmiton.png', err => {
        if (err) {
            console.log('download error', err)
        } else {
            console.log('download successful')
        }
    })
})
app.listen(8080, () => {
    console.log('listen on 8080')
})