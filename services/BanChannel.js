const Database = require("./Database")

module.exports = class BanChannel{

    static async addBannedUser(user, banned, con){
        const connection = con ? con : await Database.getConnection()
        try{
            await connection.execute("INSERT INTO g_ban (g_bn_id, g_bn_ban) VALUES (?, ?)", 
                [user, banned]
            )
        }catch (error){
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async addBannedsUsers(user, banneds, con){
        const connection = con ? con : await Database.getConnection()
        try{
            const values = new Array()
            for(const banned of banneds){
                if(banned.expiryDate) continue
                values.push([user, banned.userId])
            }
            await connection.query("INSERT INTO g_ban (g_bn_id, g_bn_ban) VALUES ?", [values])
        }catch (error){
            throw new Error(error.message)
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
                banneds.push(line.g_bn_ban)
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