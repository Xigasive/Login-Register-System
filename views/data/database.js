const mysql = require("mysql2/promise");

const dbConnection = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "root",
    database: "nodejs_login2"
})

module.exports = dbConnection;