const Database = require("./Database")

module.exports = class SubChannel{

    static async getAll(con){
        const connection = con ? con : await Database.getConnection()
        try{
            const result = await connection.execute("SELECT * FROM g_sub")

            const subs = new Map()
            for(const line of result[0]){
                if(subs.has(line.g_bn_id)){
                    subs.set(line.g_bn_id, subs.get(line.g_bn_id).push(line.g_sb_sub))
                }else{
                    subs.set(line.g_bn_id, new Array(line.g_sb_sub))
                }
            }
            return subs
        }catch (error){
            throw new Error(error.message)
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

}