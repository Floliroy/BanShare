const Database = require("./Database")

module.exports = class BanChannel{

    static async addBannedUser(user, banned, reason, con){
        const connection = con ? con : await Database.getConnection()
        try{
            await connection.execute("INSERT INTO g_ban (g_bn_id, g_bn_ban, g_bn_res) VALUES (?, ?, ?)", 
                [user, banned, reason]
            )
        }catch (error){
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async addBannedsUsers(banneds, con){
        const connection = con ? con : await Database.getConnection()
        try{
            await connection.query("INSERT INTO g_ban (g_bn_id, g_bn_ban, g_bn_res) VALUES ?", [banneds])
        }catch (error){
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async getAllFromUser(user, con){
        const connection = con ? con : await Database.getConnection()
        try{
            const result = await connection.execute("SELECT * FROM g_ban WHERE g_bn_id = ?", [user])
            const banneds = new Array()
            for(const line of result[0]){
                banneds.push({userId: line.g_bn_ban, reason: line.g_bn_res})
            }
            return banneds
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async removeFromUser(user, con){
        const connection = con ? con : await Database.getConnection()
        try{
            await connection.execute("DELETE FROM g_ban WHERE g_bn_id = ?", [user])
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

}