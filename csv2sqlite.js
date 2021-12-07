const Papa = require('papaparse')
const sqlite3 = require('sqlite3').verbose()
const fs = require('fs')
const path = require('path')

function getCSVFileMetaInfo(filepath) {
    return new Promise((resolve, reject) => {
        Papa.parse(fs.createReadStream(path.resolve(filepath)), {
            header: true,
            encoding: 'utf8',
            preview: 10,
            complete: (results, file) => {
                let columnsInfo = {}
                const { meta, data } = results
                //deduce the data type for each column
                meta.fields.forEach(field => {
                    let values = data.map(d => d[field]).filter(v => v)
                    if (values.length == 0 || values.some(v => isNaN(v))) {
                        columnsInfo[field] = 'text'
                    } else if (values.map(v => Number(v)).every(v => Number.isInteger(v))) {
                        columnsInfo[field] = 'integer'
                    } else {
                        columnsInfo[field] = 'real'
                    }
                })
                console.log('deduce column type successfully')
                resolve(columnsInfo)
            },
            error: (err, file) => reject(err)
        })
    })
}

function convertCSVToSqlite(filepath) {
    return new Promise((resolve, reject) => {
        let db = new sqlite3.Database('./test.db', err => {
            if (err) {
                reject(err)
            }
        })
        db.serialize(() => {
            db.run(`create table if not exists csv_tables(path text)`)
                .get(`select rowid id from csv_tables where path=?`, filepath, (err, row) => {
                    if (!row) {
                        db.serialize(() => {
                            db.run(`insert into csv_tables(path) values(?)`, filepath)
                                .get(`select rowid id from csv_tables where path=?`, filepath, async (err, row) => {
                                    const { id } = row
                                    const table = `table_${id}`
                                    const columnsInfo = await getCSVFileMetaInfo(filepath)
                                    const columnNames = Object.keys(columnsInfo).map(n => n.replace(/"/g, "")).map(n => `"${n}"`)
                                    const types = Object.values(columnsInfo)
                                    let createsql = `create table if not exists ${table}(${columnNames.map((name, index) => name + " " + types[index]).join(',')})`
                                    db.serialize(() => {
                                        //to accelerate the insert opearation
                                        db.run('PRAGMA journal_mode = OFF')
                                        db.run('PRAGMA synchronous = 0')
                                        db.run('PRAGMA cache_size = 1000000')
                                        db.run('PRAGMA locking_mode = EXCLUSIVE')
                                        db.run('PRAGMA temp_store = MEMORY')//after close db, it still take while to store the memory to database file
                                        db.run('BEGIN TRANSACTION')
                                        db.run(createsql)
                                        let stmt = db.prepare(`insert into ${table}(${columnNames.join(',')}) values(${columnNames.map(c => '?').join(',')})`)
                                        fs.createReadStream(path.resolve(filepath))
                                        .pipe(Papa.parse(Papa.NODE_STREAM_INPUT, {
                                            header: true,
                                            encoding: 'utf8',
                                        }))
                                        .on('data', (row) => {
                                            stmt.run(Object.keys(columnsInfo).map(c => row[c]))
                                        })
                                        .on('end', () => {
                                            //20w 行 case 5s, 50w case 15s, 100w case 35s
                                            db.serialize(() => {
                                                stmt.finalize()
                                                db.run('COMMIT')
                                                db.close()
                                            })
                                            console.log('convert csv to database successfully')
                                            resolve(table)
                                        })
                                        .on('error', err => reject(err))
                                    })
                                })
                        })
                    } else {
                        db.close()
                        console.log('close database since table exist already')
                        resolve(`table_${row.id}`)
                    }
                })
        })
    })
}

module.exports = {
    convertCSVToSqlite
}