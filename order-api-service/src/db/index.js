const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "mysql",        // docker-compose service name
  user: "root",
  password: "root",
  database: "orders_db"
});

module.exports = pool;
