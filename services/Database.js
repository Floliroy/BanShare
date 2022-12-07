/**
 * Import des librairies
 */
const mysql = require("mysql2/promise")
const pool = mysql.createPool({
    host     : process.env.HOST_NAME,
    user     : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    database : process.env.DATABASE,
    waitForConnections: true,
    connectionLimit: 50
})

pool.on("acquire", function (connection) {
    if(process.env.PORT == 4500) return
    console.log("DEBUG: Connection acquired =>", connection.threadId);
})
pool.on("release", function (connection) {
    if(process.env.PORT == 4500) return
    console.log("DEBUG: Connection released =>", connection.threadId);
})

async function keepAlive(){
    const con = await pool.getConnection()
    try{
        con.execute("select 1 from g_usr")
    }catch(error){
        console.log(error)
    }finally{
        con.release()
    }
}
setInterval(keepAlive, 15 * 60 * 1000)

/**
 * Module permettant de communiquer avec la base de données
 */
module.exports = class Database{

    /**
     * Fonction pour récupérer une connection dans le pool
     */
    static async getConnection(){
        return await pool.getConnection()
    }

    /**
     * Fonction pour release une connection précédemment récupéré
     */
    static releaseConnection(connection){
        connection.release()
    }

}