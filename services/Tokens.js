const Database = require("./Database")

module.exports = class Tokens{

    static async get(userId, con){
        const connection = con ? con : await Database.getConnection()
        try{
            const result = await connection.execute("SELECT * FROM tokens WHERE userId = ?", [userId])
            const token = result[0][0]
            token.userId = undefined
            token.scope = [
                "chat:edit",
                "chat:read",
                "moderation:read",
                "moderator:manage:banned_users"
            ]
            return token
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async save(userId, data, con){
        const connection = con ? con : await Database.getConnection()
        try{
            await connection.execute("UPDATE tokens SET accessToken = ?, refreshToken = ?,  expiresIn = ?,  obtainmentTimestamp = ? WHERE userId = ?", 
                [data.accessToken, data.refreshToken, data.expiresIn, data.obtainmentTimestamp, userId]
            )
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async create(userId, data, con){
        const connection = con ? con : await Database.getConnection()
        try{
            await connection.query("INSERT INTO tokens (userId, accessToken, refreshToken, expiresIn, obtainmentTimestamp) VALUES ?", 
                [[[userId, data.access_token, data.refresh_token, data.expires_in, (new Date().getTime())]]]
            )
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

}