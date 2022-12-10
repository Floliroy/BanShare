require("dotenv").config()

/**
 * My libraries
 */
const ApiTwitch = require("./services/ApiTwitch")

const express = require("express")
const cookieParser = require("cookie-parser")
const app = express()

/**
 * Website Init
 */
app.set("view engine", "ejs")
app.use(express.urlencoded({ extended: true }))
app.use(express.static("public"))
app.use(cookieParser())

/**
 * Website pages
 */
const GetRequest = require("./controllers/GetRequest")
GetRequest(app)
const PostRequest = require("./controllers/PostRequest")
PostRequest(app)

/**
 * Lancement serveur web
 */
async function start(){
    await ApiTwitch.initListener(app)
    app.listen(process.env.PORT, async function(){
        console.log(`Server running on port ${process.env.PORT}!`)
        await ApiTwitch.startListener()
    })
}
start()

/**
 * Change base console.log
 */
const basicConsole = console.log
Date.prototype.format = function(){
    return this.toLocaleDateString('fr-FR', { 'timeZone': 'Europe/Paris', 
        'day': '2-digit', 'month': '2-digit', 'year': 'numeric', 
        'hour': '2-digit', 'minute': '2-digit', 'second': '2-digit', 'hour12': false 
    }).replace(',', ' -')
}
console.log = function(){
    const date = `[${new Date().format()}]`
    Array.prototype.unshift.call(arguments, date)
    basicConsole.apply(this, arguments)
}

/**
 * To avoid crashes
 */
process.on("uncaughtException", (err) => {
    console.log(err)
})