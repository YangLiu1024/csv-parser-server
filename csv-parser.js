// const csv = require('fast-csv')
// csv.parse({...}), support options
// * delimiter, the delimiter that separate columns, default is ','
// * headers, boolean|string[]|(string[] => string[]), default is false. 
//            if set to true, the first line will be treated as headers. 
//            if you want to customize headers, you can pass string[], and remember to set renameHeaders to true, otherwise the first line will be treated as data
//            if you want transform the headers, you can provide a transform function
//            if you want to skip specific column, you can pass a sparse headers, such as ['a', undefined, 'b'], then second column will be skipped
// * renameHeaders, default is false, if you want to replace first line to customized headers, set it to true. if headers is functions, this option is always set to true.
// * maxRows,  number, if > 0, then only the specified number of rows will be parsed
// * skipRows, number, the specified number of parsed rows will be skipped
// * skipLines, number, the specified number of lines will be skipped

// csv parse events
// * headers, if headers set to true, then pass the parsed headers to this event handler. if headers is customized array, then pass the array to this event handler. if headers is function, pass the transformed headers to event handler
// * data, if headers is present, then data will be an object. if headers is not present, data will be array.
// * data-invalid, when data is invalid
// * error, when error happen
// * end, when parse finish

// csv parse methods
// * parse(options), return a CsvParserStream which can be piped or written to, fs.createReadStream('a.csv').pipe(csv.parse(options)).on('data', data => {}).on('end', rowCount => {})
// * parseStream(readableStream, options): CsvParserStream, csv.parseStream(fs.createReadStream('a.csv'), options)
// * parseFile(path, options): CsvParserStream, csv.parseFile(path)
// * parseString(string, options): CsvParserStream, csv.parseString(string)
const { parseStream } = require('fast-csv')
const fs = require('fs')
const path = require('path')

const parse = (res, filePath, options = {}) => {
    const result = {datas: []}
    let fp = path.resolve(filePath);
    if (!fs.existsSync(fp) || !fs.lstatSync(fp).isFile()) {
        res.status(500).send('invalid file path: ' + filePath)
    } else {
        res.set({
            'content-type': 'application/json;charset=utf-8',
            'Access-Control-Allow-Origin': '*'
        })
        parseStream(fs.createReadStream(fp), Object.assign({headers: true, delimiter: ',', discardUnmappedColumns: true}, options))
        .on('headers', h => res.write(JSON.stringify({headers: h})))
        //.on('data', row => result.datas.push(row))
        .on('data', row => res.write(JSON.stringify(row)))
        //.pipe(res)
        .on('end', rc => {
            res.write(JSON.stringify({rowCount: rc}))
            res.end()
        })
        .on('error', err => {
            res.status(500).send(err.toString())
        })
    }
    // return new Promise((resolve, reject) => {
    //     console.log('start to parse ', new Date().toString())
    //     const result = {datas: []}
    //     let fp = path.resolve(filePath);
    //     if (!fs.existsSync(fp) || !fs.lstatSync(fp).isFile()) {
    //         reject(filePath +  ' is invalid.')
    //     } else {
    //         parseStream(fs.createReadStream(fp), Object.assign({headers: true, delimiter: ',', discardUnmappedColumns: true}, options))
    //         .on('headers', h => result.headers = h)
    //         //.on('data', row => result.datas.push(row))
    //         .on('data', row => res.write(JSON.stringify(row)))
    //         .on('end', rc => {
    //           result.rowCount = rc;
    //           console.log('finish parse ', new Date().toString(), rc)
    //           res.end()
    //           resolve(result)
    //         })
    //         .on('error', err => {
    //             console.log('error ', err)
    //             res.status(500).end()
    //             reject(err)
    //         })
    //     }

    // })

}

exports.parse = parse;