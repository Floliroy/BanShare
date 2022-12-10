function replaceImg(image){
    $(image).attr("src", "./images/imgProfil.png")
}

$("#modalShare").on("shown.bs.modal", function () {
    $("#shareKeywords").trigger("focus")
})