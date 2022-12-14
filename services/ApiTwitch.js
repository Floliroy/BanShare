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
const hostName = process.env.HOSTNAME

let listener

async function getAccessToken(req, redirect){
    const result = await axios.post("https://id.twitch.tv/oauth2/token", {
        client_id: clientId,
        client_secret: clientSecret,
        code: req.query.code,
        grant_type: "authorization_code",
        redirect_uri: `https://${req.hostname}/${redirect}`
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

function reasonContainKeyword(reason, keywords){
    const splitKeywords = keywords.split(";")
    for(const keyword of splitKeywords){
        if(keyword.trim() != "" && reason.includes(keyword.trim())){
            return true
        }
    }
    return false
}

const mapListener = new Map()
async function setupOnBan(userId){
    const userListener = await listener.subscribeToChannelBanEvents(userId, function(event){
        setTimeout(async function(){ 
            if(!event.isPermanent) return

            const connect = await Database.getConnection()
            try{
                const authProvider = await getRefreshAuthProvider(event.broadcasterId, connect)
                const apiClient = new ApiClient({ authProvider })
                if(!await apiClient.moderation.checkUserBan(event.broadcasterId, event.userId)) return
                
                const sharing = await Users.getSharingDatas(event.broadcasterId, connect)
                let containKeyword = true
                if(sharing.keywords){
                    containKeyword = reasonContainKeyword(event.reason, sharing.keywords)
                }

                if(!sharing.isSharing || !containKeyword) return

                const reason = event.reason && event.reason.trim() != "" ? event.reason : null
                BanChannel.addBannedUser(event.broadcasterId, event.userId, reason, connect)
                console.log(`LOG: New ban into ${event.broadcasterDisplayName}'s list: ${event.userDisplayName}`)

                const subs = await SubChannel.getFromUser(event.broadcasterId, connect)
                for(const sub of subs){
                    const auth = await getRefreshAuthProvider(sub, connect)
                    const api = new ApiClient({ authProvider: auth })

                    if(!await api.moderation.checkUserBan(sub, event.userId)){
                        let reason = `Ban copied from ${event.broadcasterDisplayName}'s channel`
                        if(event.reason && event.reason.trim() != ""){
                            reason += ` for: ${event.reason}`
                        }
                        api.moderation.banUser(sub, sub, {duration: null, reason, userId: event.userId})    
                    }            
                }
            }catch(error){
            }finally{
                Database.releaseConnection(connect)
            } 
        }, 10 * 60 * 1000)
    })
    mapListener.set(userId, userListener)
}

module.exports = class ApiTwitch {

    static async initListener(app){
        const authProvider = new ClientCredentialsAuthProvider(clientId, clientSecret)
        const apiClient = new ApiClient({ authProvider })
        await apiClient.eventSub.deleteAllSubscriptions()

        listener = new EventSubMiddleware({
            apiClient, secret, hostName,
            strictHostCheck: true,
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
            }
            
            console.log("INFO: Logged on Twitch Bot")
        }catch(error){
            console.log(error)
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

    static async shareBans(userId, keywords){
        const con = await Database.getConnection()
        try{
            const authProvider = await getRefreshAuthProvider(userId, con)
            const api = new ApiClient({ authProvider })
    
            const banneds = await api.moderation.getBannedUsersPaginated(userId).getAll()

            await setupOnBan(userId)

            let key = keywords && keywords.trim() != "" ? keywords : null
            Users.updateShare(userId, true, key, con)

            const values = new Array()
            for(const banned of banneds){
                let containKeyword = true
                if(key){
                    if(banned.reason){
                        containKeyword = reasonContainKeyword(banned.reason, key)
                    }else{
                        containKeyword = false
                    }
                }
                if(banned.expiryDate || !containKeyword) continue
                values.push([userId, banned.userId, banned.reason])
            }
            BanChannel.addBannedsUsers(values, con)
        }catch(error){
            console.log(error)
        }finally{
            Database.releaseConnection(con)
        }
    }

    static async unshareBans(userId){
        if(mapListener.has(userId)){
            mapListener.get(userId).stop()
        }
    }

    static async subToUser(subId, subName, userId){
        const con = await Database.getConnection()
        try{
            const authProvider = await getRefreshAuthProvider(userId, con)
            const api = new ApiClient({ authProvider })

            SubChannel.subToUser(subId, userId, con)
            const banneds = await BanChannel.getAllFromUser(subId, con)

            const result = await api.moderation.getBannedUsersPaginated(userId).getAll()
            const alreadyBanneds = new Array()
            for(const banned of result){
                if(banned.expiryDate) continue
                alreadyBanneds.push(banned.userId)
            }
            for(const banned of banneds){
                if(!alreadyBanneds.includes(banned.userId)){
                    let reason = `Ban copied from ${subName}'s channel`
                    if(banned.reason && banned.reason.trim() != ""){
                        reason += ` for: ${banned.reason}`
                    }
                    api.moderation.banUser(userId, userId, {duration: null, reason, userId: parseInt(banned.userId)})  
                }
            }

            console.log(`LOG: User ${userId} subbed to ${subName}'s ban list`)
        }catch(error){
            console.log(error)
        }finally{
            Database.releaseConnection(con)
        }
    }

}