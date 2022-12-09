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
app.use(express.json())
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
 * To avoid crashes
 */
process.on("uncaughtException", (err) => {
    console.log(err)
})