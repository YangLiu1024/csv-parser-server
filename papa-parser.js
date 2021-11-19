const Papa = require('papaparse')

const parse = (rs, options = {}) => {
    return new Promise((res, rej) => {
        let start = options.startIndex || 0
        let stop = options.stopIndex || Number.MAX_VALUE
        let = stop - start + 1;
        let items = []
        let index = -1;
        rs.pipe(Papa.parse(Papa.NODE_STREAM_INPUT, {
            header: true,
            encoding: 'utf8',
        }))
        .on('data', data => {
            index++;
            if (index >= start && index <= stop) {
                items.push(data)
                if (index == stop) {
                    rs.destroy()
                    res(items)
                }
            }
        })
        .on('end', () => {
            res(items)
        })
        .on('error', err => {
            rej(err)
        })
    })
}

const count = (rs) => {
    return new Promise((resolve, reject) => {
        let line = 0
        rs.pipe(Papa.parse(Papa.NODE_STREAM_INPUT, {
            header: true,
            encoding: 'utf8',
        }))
        .on('data', data => line++)
        .on('end', () => {
            resolve(line)
        })
        .on('err', err => reject(err))
    })
}
module.exports = {
    parse,
    count
}
