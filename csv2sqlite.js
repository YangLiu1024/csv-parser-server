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

async function convertCSVToSqlite(filepath) {
    //for different csv file, convert to different database to avoid database locked issue
    const dbName = __generateDatabaseName(filepath)
    const dbpath = `./db/${dbName}`
    if (fs.existsSync(dbpath)) {
        return dbName
    }
    fs.closeSync(fs.openSync(dbpath, 'w'))
    let db = await __connectDatabase(dbpath)
    const table = 'csv_table'
    const columnsInfo = await getCSVFileMetaInfo(filepath)
    const columnNames = Object.keys(columnsInfo).map(n => __formatColumnName(n))
    const types = Object.values(columnsInfo)
    let createsql = `create table if not exists ${table}(${columnNames.map((name, index) => name + " " + types[index]).join(',')})`

    return new Promise((resolve, reject) => {
        //must wrap all db operation in promise to wait it finish, otherwise following operation will failed since the transaction here has not been done
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
                    skipEmptyLines: 'greedy'
                }))
                .on('data', (row) => stmt.run(Object.keys(columnsInfo).map(c => row[c])))
                .on('end', () => {
                    //20w 行 case 5s, 50w case 15s, 100w case 35s
                    db.serialize(() => {
                        stmt.finalize()
                        db.run('COMMIT')
                        db.close(err => {
                            if (err) {
                                reject(err)
                            }
                            console.log('convert csv to database successfully')
                            resolve(dbName)//must resolve in db close callback, otherwise the db operation has not been finished
                        })
                    })
                })
                .on('error', err => reject(err))
        })
    })
}

async function fetchCSVRows({ columns, filePath, offset, limit, sorter:{columnName, asc}, filter}) {
    const dbName = await convertCSVToSqlite(filePath)
    const dbpath = `./db/${dbName}`
    let db = await __connectDatabase(dbpath)
    let queryColumns = columns || Object.keys(await getCSVFileMetaInfo(filePath))
    let sortText = columnName && ` ORDER BY ${__formatColumnName(columnName)} ${asc ? "asc" : "desc"}`
    let filterText = __generateFilterText(filter)

    return new Promise((resolve, reject) => {
        let selectsql = `SELECT rowid rowId, ${queryColumns.map(n => __formatColumnName(n)).join(',')} FROM csv_table ${filterText ? " WHERE " + filterText : ''} ${sortText || ""} LIMIT ? OFFSET ?`
        console.log(selectsql)
        let results = {}
        db.serialize(() => {
            db.all(selectsql, [limit, offset], (err, rows) => {
                if (err) {
                    console.log(err)
                    reject(err)
                }
                results["rows"] = rows
            }).get(`SELECT count(*) as count FROM csv_table ${filterText ? " WHERE " + filterText : ""}`, (err, row) => {
                if (err) {
                    reject(err)
                }
                results["totalCount"] = row.count
            }).close(err => {
                if (err) {
                    console.log('fail to close db ', err)
                    reject(err)
                }
                console.log('database closed')
                resolve(results)
            })
        })
    })
}

async function fetchColumnUniqueValue({columnName, filter, filePath}) {
    const dbName = await convertCSVToSqlite(filePath)
    const dbpath = `./db/${dbName}`
    let db = await __connectDatabase(dbpath)
    return new Promise((resolve, reject) => {
        const filterText = __generateFilterText(filter)
        let results = []
        db.serialize(() => {
            db.all(`SELECT DISTINCT ${__formatColumnName(columnName)} as column FROM csv_table ${filterText ? " WHERE " + filterText : ""}`, (err, rows) => {
                if (err) {
                    reject(err)
                }
                results = rows.map(r => r["column"])
            }).close(err => {
                if (err) {
                    reject(err)
                }
                console.log('database closed')
                resolve(results)
            })
        })

    })
}

async function removeCSVSqlite({filePath}) {
    const dbName = __generateDatabaseName(filePath)
    const dbpath = `./db/${dbName}`
     try {
        fs.unlinkSync(dbpath)
     } catch (err) {
        throw err
     }
}

function __generateDatabaseName(filePath) {
    return filePath.replace(/[\\\/.:]/g, "_")
}

function __formatColumnName(columnName) {
    return `\"${columnName.replace(/"/g, "")}\"`
}

async function __connectDatabase(dbpath) {
    let db = new sqlite3.Database(dbpath, err => {
        if (err) {
            throw err
        }
        console.log('open database successfully')
    })
    return db
}

function __generateFilterText(filter) {
    return filter && Object.entries(filter).map(([key, value]) => {
        const cn = __formatColumnName(key)
        if (value.type === 'ENUM' && Array.isArray(value.values) && value.values.length > 0) {
            return ` (${cn} IN (${value.values.join(',')})) `
        } else if (value.type === 'NUMBER') {
            if (value.min && value.max) {
                return ` ((${cn} >= ${value.min}) AND (${cn} <= ${value.max})) `
            } else if (value.min) {
                return ` (${cn} >= ${value.min}) `
            } else if (value.max) {
                return ` (${cn} <= ${value.max})) `
            }
        } else if (value.type === 'TEXT' && value.pattern) {
            return ` (${cn} LIKE ${value.pattern}) `
        }
        return ''
    }).filter(f => f).join(' AND ')
}

module.exports = {
    convertCSVToSqlite,
    fetchCSVRows,
    fetchColumnUniqueValue,
    removeCSVSqlite
}