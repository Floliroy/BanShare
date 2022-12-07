const Database = require("./Database")
const Tokens = require("./Tokens")

function getSubs(userId, users){
    for(const user of users){
        if(userId == user.id){
            return user.subs
        } 
    }
    return 0
}

module.exports = class Users{

    static async saveUser(id, name, image, token, con){
        const connection = con ? con : await Database.getConnection()
        try{
            let result = await connection.execute("SELECT * FROM g_usr WHERE g_ur_id = ?", [id])

            //Premiere connexion
            if(!result[0] || result[0].length <= 0){
                await connection.execute("INSERT INTO g_usr (g_ur_id, g_ur_name, g_ur_img, g_ur_ttv_tok) VALUES (?, ?, ?, ?)", 
                    [id, name, image, token.access_token]
                )                
                await Tokens.create(id, token, connection)
                console.log(`LOG: Ajout de l'utilisateur ${name}`)
            }else{
                await connection.execute("UPDATE g_usr SET g_ur_name = ?, g_ur_img = ? WHERE g_ur_id = ?", 
                    [name, image, id]
                )
                console.log(`LOG: Mise à jour de l'utilisateur ${name}`)
            }
            result = await connection.execute("SELECT g_ur_ttv_tok FROM g_usr WHERE g_ur_id = ?", [id])
            return result[0][0].g_ur_ttv_tok
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async getAllShare(con){
        const connection = con ? con : await Database.getConnection()
        try{
            const result = await connection.execute("SELECT g_ur_id, g_ur_name FROM g_usr WHERE g_ur_shr = 1")
            const users = new Array()
            for(const line of result[0]){
                users.push({id: line.g_ur_id, name: line.g_ur_name})
            }
            return users
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async updateShare(id, share, con){
        const connection = con ? con : await Database.getConnection()
        try{
            await connection.execute("UPDATE g_usr SET g_ur_shr = ? WHERE g_ur_id = ?", 
                [share ? 1 : 0, id]
            )
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection)
        }
    }

    static async checkConnected(userId, accessToken, con){
        const connection = con ? con : await Database.getConnection()
        try{
            const result = await connection.execute("SELECT 1 FROM g_usr WHERE g_ur_id = ? AND g_ur_ttv_tok = ?", 
                [userId, accessToken]
            )
            return result[0] && result[0].length > 0
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async getDatas(userId, con){
        if(!userId) return null

        const connection = con ? con : await Database.getConnection()
        try{
            const user = {}
            let result = await connection.execute("SELECT * FROM g_usr WHERE g_ur_id = ?", [userId])
            user.id = result[0][0].g_ur_id
            user.name = result[0][0].g_ur_name
            user.image = result[0][0].g_ur_img
            user.share = result[0][0].g_ur_shr && result[0][0].g_ur_shr == 1

            result = await connection.execute("SELECT g_sb_id FROM g_sub WHERE g_sb_sub = ?", [user.name])
            user.subTo = new Array()
            for(const line of result[0]){
                user.subTo.push(line.g_sb_id)
            }
            return user
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async getUserNameWithId(userId, con){
        const connection = con ? con : await Database.getConnection()
        try{
            let result = await connection.execute("SELECT g_ur_name FROM g_usr WHERE g_ur_id = ?", [userId])
            return result[0][0].g_ur_name
        }catch (error){
            throw new Error(error.message)
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

    static async getAllDatas(con){
        const connection = con ? con : await Database.getConnection()
        try{
            const users = new Array()
            let result = await connection.execute("SELECT * FROM v_all_usr")
            for(const line of result[0]){
                users.push({
                    id: line.g_ur_id,
                    name: line.g_ur_name,
                    image: line.g_ur_img,
                    subs: line.subs,
                    bans: line.bans,
                })
            }
            users.sort(function(a, b){
                return getSubs(b.id, users) - getSubs(a.id, users)
            })
            return users
        }catch (error){
            return new Array()
        }finally{
            if(!con) Database.releaseConnection(connection) 
        }
    }

}