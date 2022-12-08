const Database = require("./Database")

module.exports = class SubChannel{

    static async getAll(con){
        const connection = con ? con : await Database.getConnection()
        try{
            const result = await connection.execute("SELECT * FROM g_sub")

            const subs = new Map()
            for(const line of result[0]){
                if(subs.has(line.g_bn_id)){
                    subs.set(line.g_sb_id, subs.get(line.g_sb_id).push(line.g_sb_sub))
                }else{
                    subs.set(line.g_sb_id, new Array(line.g_sb_sub))
                }
            }
            return subs
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async getFromUser(userId, con){
        const connection = con ? con : await Database.getConnection()
        try{
            const result = await connection.execute("SELECT g_sb_sub FROM g_sub WHERE g_sb_id = ?", [userId])

            const subs = new Array()
            for(const line of result[0]){
                subs.push(line.g_sb_sub)
            }
            return subs
        }catch (error){
            return new Array()
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async subToUser(user, sub, con){
        const connection = con ? con : await Database.getConnection()
        try{
            await connection.execute("INSERT INTO g_sub (g_sb_id, g_sb_sub) VALUES (?, ?)", 
                [user, sub]
            )
        }catch (error){
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async unsubToUser(user, sub, con){
        const connection = con ? con : await Database.getConnection()
        try{
            await connection.execute("DELETE FROM g_sub WHERE g_sb_id = ? AND g_sb_sub = ?", 
                [user, sub]
            )
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async removeFromUser(user, con){
        const connection = con ? con : await Database.getConnection()
        try{
            await connection.execute("DELETE FROM g_ban WHERE g_sb_id = ?", [user])
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

}