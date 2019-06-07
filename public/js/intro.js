let debug = false;
let timeOutMaxLen;
$("#nameInput").keydown(function(e){
    let textinput = document.getElementById('nameInput');
    if (e.keyCode == 13) { // disable newline
        e.preventDefault();
        return false;
    }; 

    if (textinput.value.length == textinput.maxLength) {
        $("#textMaxLen").css("opacity", "1")
        clearTimeout(timeOutMaxLen)
        timeOutMaxLen = setTimeout(function() {
            $("#textMaxLen").css("opacity", "0")
        }, 2000)
    } 
});

document.getElementById('nameInput').addEventListener('input', function(e) {
    let textinput = document.getElementById('nameInput');
    $("#nameButton").html("I'm " + textinput.value)
    $("#nameButton").css("opacity", "1")

    if (textinput.value.length == 0) {
        $("#nameButton").css("opacity", "0")
    }
});

// if debug, show intro text animation
if (debug) {
    setTimeout(function() {
        $("#welcomeText1").css('opacity','1');
    }, 1000)

    setTimeout(function() {
        $("#welcomeText2").css('opacity','1');
    }, 3000)

    setTimeout(function() {
        $("#welcomeText3").css('opacity','1');
    }, 5000)

    setTimeout(function() {
        $("#welcomeText4").css('opacity','1');
    }, 7000)

} else {
    for (let i = 1; i < 6; i++) {
        $("#welcomeText" + i).css('opacity','1');
    }
}
