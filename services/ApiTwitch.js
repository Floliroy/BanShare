const { ApiClient } = require("@twurple/api")

const { StaticAuthProvider, RefreshingAuthProvider } = require("@twurple/auth")
const { ChatClient } = require("@twurple/chat")
const fs = require("fs")
const axios = require("axios")

const Database = require("./Database")
const Users = require("./Users")
const SubChannel = require("./SubChannel")
const BanChannel = require("./BanChannel")
const Tokens = require("./Tokens")

const clientId = process.env.TWITCH_CLIENT_ID
const clientSecret = process.env.TWITCH_CLIENT_SECRET

async function getAccessToken(req, redirect){
    const result = await axios.post("https://id.twitch.tv/oauth2/token", {
        client_id: clientId,
        client_secret: clientSecret,
        code: req.query.code,
        grant_type: "authorization_code",
        redirect_uri: `https://ban.floliroy.fr/${redirect}`
    }).catch(() => { console.log("Error with twitch oauth2") })
    if(!result) return null

    return result.data
}

async function getRefreshAuthProvider(userId, con){
    const tokenData = await Tokens.get(userId, con)
    return new RefreshingAuthProvider({
        clientId, clientSecret,
        onRefresh: async function(newTokenData){
            Tokens.save(userId, newTokenData, con)
        }
    }, tokenData)
}

module.exports = class ApiTwitch {

    static async initListener(){
        const con = await Database.getConnection()
        try{
            const allShare = await Users.getAllShare(con)

            const allSubs = await SubChannel.getAll(con)
            let subsChannels = new Array()
            for(const [_, subs] of allSubs){
                subsChannels.concat(subs.filter((sub) => subsChannels.indexOf(sub) < 0))
            }

            for(const share of allShare){
                const authProvider = await getRefreshAuthProvider(share.id, con)
                const chatClient = new ChatClient({ authProvider, channels: [share.name] })
                await chatClient.connect()
    
                chatClient.onBan(async function(user, _, msg){
                    BanChannel.addBannedUser(msg.channelId, msg.targetUserId, con)
    
                    if(allSubs.has(msg.channelId)){
                        const subs = allSubs.get(msg.channelId)
                        for(const sub of subs){
                            const auth = await getRefreshAuthProvider(sub, con)
                            const api = new ApiClient({ authProvider: auth })
    
                            if(!await api.moderation.checkUserBan(sub, msg.targetUserId)){
                                api.moderation.banUser(sub, sub, {duration: null, reason: `Ban copied from ${user}'s channel`, userId: msg.targetUserId})    
                            }            
                        }
                    }
                })
            }
            
            console.log("Logged on Twitch Bot")
        }catch(error){
            throw new Error(error.message)
        }finally{
            Database.releaseConnection(con)
        }
    }

    static async login(req, res){
        const token = await getAccessToken(req, "login")
        if(!token) return res.redirect("/")

        const authProvider = new StaticAuthProvider(process.env.TWITCH_CLIENT_ID, token.access_token)
        const api = new ApiClient({ authProvider })

        const streamer = await api.users.getMe()
        const accessSaved = await Users.saveUser(streamer.id, streamer.displayName, streamer.profilePictureUrl, token)
        
        res.cookie("userId", streamer.id)
        res.cookie("accessToken", accessSaved)
    }

    static async shareBans(userId){
        const con = await Database.getConnection()
        try{
            const authProvider = await getRefreshAuthProvider(userId, con)
            const api = new ApiClient({ authProvider })
    
            const banneds = await api.moderation.getBannedUsers(userId)

            Users.updateShare(userId, true, con)
            BanChannel.addBannedsUsers(userId, banneds.data, con)
        }catch(error){
            throw new Error(error.message)
        }finally{
            Database.releaseConnection(con)
        }
    }

    static async subToUser(subId, subName, userId){
        const con = await Database.getConnection()
        try{
            const authProvider = await getRefreshAuthProvider(userId, con)
            const api = new ApiClient({ authProvider })

            SubChannel.subToUser(subId, userId, con)
            const banneds = await BanChannel.getAllFromUser(subId, con)

            for(const banned of banneds){
                if(!await api.moderation.checkUserBan(userId, banned)){
                    api.moderation.banUser(userId, userId, {duration: null, reason: `Ban copied from ${subName}'s channel`, userId: banned})  
                }
            }
            
            const auth = await getRefreshAuthProvider(subId, con)
            const chatClient = new ChatClient({ authProvider: auth, channels: [subName] })
            await chatClient.connect()

            chatClient.onBan(async function(user, _, msg){
                BanChannel.addBannedUser(subId, msg.targetUserId, con)
                
                if(!await api.moderation.checkUserBan(userId, msg.targetUserId)){
                    api.moderation.banUser(userId, userId, {duration: null, reason: `Ban copied from ${user}'s channel`, userId: msg.targetUserId})    
                }           
            })
        }catch(error){
            throw new Error(error.message)
        }finally{
            Database.releaseConnection(con)
        }
    }

}