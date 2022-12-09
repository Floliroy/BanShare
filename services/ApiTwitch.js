const { ApiClient } = require("@twurple/api")
const { StaticAuthProvider, RefreshingAuthProvider, ClientCredentialsAuthProvider } = require("@twurple/auth")
const { EventSubMiddleware } = require("@twurple/eventsub")

const axios = require("axios")

const Database = require("./Database")
const Users = require("./Users")
const SubChannel = require("./SubChannel")
const BanChannel = require("./BanChannel")
const Tokens = require("./Tokens")

const clientId = process.env.TWITCH_CLIENT_ID
const clientSecret = process.env.TWITCH_CLIENT_SECRET
const secret = process.env.SECRET

let listener

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

const mapAuthProvider = new Map()
async function getRefreshAuthProvider(userId, con){
    if(mapAuthProvider.has(userId)){
        return mapAuthProvider.get(userId)
    }

    const tokenData = await Tokens.get(userId, con)
    const authProvider = new RefreshingAuthProvider({
        clientId, clientSecret,
        onRefresh: async function(newTokenData){
            await Tokens.save(userId, newTokenData)
        }
    }, tokenData)
    mapAuthProvider.set(userId, authProvider)
    return authProvider
}

/*function setupOnBan(chatClient){
    chatClient.onBan(async function(user, _, msg){
        const connect = await Database.getConnection()
        try{
            if(!await Users.isSharing(msg.channelId, connect)) return

            BanChannel.addBannedUser(msg.channelId, msg.targetUserId, connect)
            console.log(`LOG: New ban into ${user}'s list: ${msg.user.value}`)

            const subs = await SubChannel.getFromUser(msg.channelId, connect)
            for(const sub of subs){
                const auth = await getRefreshAuthProvider(sub, connect)
                const api = new ApiClient({ authProvider: auth })

                if(!await api.moderation.checkUserBan(sub, msg.targetUserId)){
                    //api.moderation.banUser(sub, sub, {duration: null, reason: `Ban copied from ${user}'s channel`, userId: msg.targetUserId})    
                }            
            }
        }catch(error){
        }finally{
            Database.releaseConnection(connect)
        }
    })
}*/

async function setupOnBan(userId){
    await listener.subscribeToChannelBanEvents(userId, async function(event){
        if(!event.isPermanent) return

        const connect = await Database.getConnection()
        try{
            if(!await Users.isSharing(event.broadcasterId, connect)) return

            BanChannel.addBannedUser(event.broadcasterId, event.userId, connect)
            console.log(`LOG: New ban into ${event.broadcasterDisplayName}'s list: ${event.userDisplayName}`)
            console.log(`   reason -> ${event.reason}`)

            const subs = await SubChannel.getFromUser(event.broadcasterId, connect)
            for(const sub of subs){
                const auth = await getRefreshAuthProvider(sub, connect)
                const api = new ApiClient({ authProvider: auth })

                if(!await api.moderation.checkUserBan(sub, event.userId)){
                    //api.moderation.banUser(sub, sub, {duration: null, reason: `Ban copied from ${user}'s channel`, userId: event.userId})    
                }            
            }
        }catch(error){
        }finally{
            Database.releaseConnection(connect)
        }
    })
}

module.exports = class ApiTwitch {

    static async initListener(app){
        const authProvider = new ClientCredentialsAuthProvider(clientId, clientSecret)
        const apiClient = new ApiClient({ authProvider })
        await apiClient.eventSub.deleteAllSubscriptions()
        
        listener = new EventSubMiddleware({
            apiClient, secret,
            hostName: "ban.floliroy.fr",
            pathPrefix: "/twitch"
        })
        await listener.apply(app)
    }

    static async startListener(){
        await listener.markAsReady()
        
        const con = await Database.getConnection()
        try{
            const allShare = await Users.getAllShare(con)

            for(const share of allShare){
                console.log(`INFO: Listener on ${share.name} channel`)
                await setupOnBan(share.id)

                /*const chatClient = new ChatClient({ authProvider, channels: [share.name.toLowerCase()] })
                await chatClient.connect()
                setupOnBan(chatClient)*/
            }
            
            console.log("INFO: Logged on Twitch Bot")
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

            await setupOnBan(userId)
            /*const chatClient = new ChatClient({ authProvider, channels: [userName.toLowerCase()] })
            await chatClient.connect()
            setupOnBan(chatClient)*/

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

            const result = await api.moderation.getBannedUsers(userId)
            const alreadyBanneds = new Array()
            for(const banned of result.data){
                if(banned.expiryDate) continue
                alreadyBanneds.push(banned.userId)
            }
            for(const banned of banneds){
                if(!alreadyBanneds.includes(banned)){
                    api.moderation.banUser(userId, userId, {duration: null, reason: `Ban copied from ${subName}'s channel`, userId: banned})  
                }
            }

            console.log(`LOG: User ${userId} subbed to ${subName}'s ban list`)
        }catch(error){
            throw new Error(error.message)
        }finally{
            Database.releaseConnection(con)
        }
    }

}