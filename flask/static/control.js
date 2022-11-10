var color_picker = document.getElementsByClassName("color_picker");
var bright_picker = document.getElementsByClassName("bright_picker");
var bright_display = document.getElementsByClassName("bright_display");
for (let i = 0; i < color_picker.length; i++) {
    color_picker[i].addEventListener('change', (event) => {
        change_color(color_picker[i].value, bright_picker[i].value, color_picker[i].name);
    })
}
for (let i = 0; i < bright_picker.length; i++) {
    bright_picker[i].addEventListener('change', (event) => {
        change_color(color_picker[i].value, bright_picker[i].value, bright_picker[i].name);
        bright_display[i].innerHTML = bright_picker[i].value
    })
}

var temp_display = document.getElementsByClassName("temp_display");
var temp_picker = document.getElementsByClassName("temp_picker");
// K to RGB
function temp_to_RGB(temp_k) {
    var red = 0
    var green = 0
    var blue = 0
 
    if (temp_k <= 66) {
       red = 255
       green = 99.4708025861 * Math.log(temp_k) - 161.1195681661
 
       if (temp_k <= 19) {
          blue = 0
       } else {
          blue = 138.5177312231 * Math.log(temp_k - 10) - 305.0447927307
       }
    } else {
       red = 329.698727446 * ((temp_k - 60) ** -0.1332047592)
       green = 288.1221695283 * ((temp_k - 60) ** -0.0755148492)
       blue = 255
    }
 
    red = red < 0 ? 0 : red;
    red = red > 255 ? 255 : red;
    green = green < 0 ? 0 : green;
    green = green > 255 ? 255 : green;
    blue = blue < 0 ? 0 : blue;
    blue = blue > 255 ? 255 : blue;
 
    console.log(`red: ${red}, green: ${green}, blue: ${blue}`)
    red_text = red > 9 ? Math.round(red).toString(16) : "0" + Math.round(red).toString(16);
    green_text = green > 9 ? Math.round(green).toString(16) : "0" + Math.round(green).toString(16);
    blue_text = blue > 9 ? Math.round(blue).toString(16) : "0" + Math.round(blue).toString(16);
    color = '#' + red_text + green_text + blue_text;
    return color
 }
for (let i = 0; i < temp_picker.length; i++) {
    temp_picker[i].addEventListener('change', (event) => {
        change_color(temp_to_RGB(temp_picker[i].value), bright_picker[i].value, temp_picker[i].name);
        temp_display[i].innerHTML = temp_picker[i].value + '00 K'
        // color_picker[i].value = temp_to_RGB(temp_picker[i].value)
    })
}

var close_btn = document.getElementsByClassName("close");
for (let i = 0; i < close_btn.length; i++) {
    close_btn[i].addEventListener('click', (event) => {
        change_color('#000000', 0, close_btn[i].name);
        // color_picker[i].value = '#000000'
    })
}

var white_btn = document.getElementsByClassName("white");
for (let i = 0; i < white_btn.length; i++) {
    white_btn[i].addEventListener('click', (event) => {
        change_color('#FFFFFF', 100, white_btn[i].name);
        // color_picker[i].value = '#FFFFFF'
    })
}

var party_btn = document.getElementsByClassName("party");
for (let i = 0; i < party_btn.length; i++) {
    async function party_time() {
        for (let party_i=0; party_i<5; party_i++){
            change_color('#FF0000', 100, party_btn[i].name);
            await new Promise(r => setTimeout(r, 1000));
            change_color('#0000FF', 100, party_btn[i].name);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    party_btn[i].addEventListener('click', (i, event) => party_time())
}

var read_btn = document.getElementsByClassName("reading");
for (let i = 0; i < read_btn.length; i++) {
    read_btn[i].addEventListener('click', (event) => {
        change_color('#ffb16e', 100, read_btn[i].name);
        // color_picker[i].value = '#ffb16e'
    })
}

var movie_btn = document.getElementsByClassName("movie");
for (let i = 0; i < movie_btn.length; i++) {
    movie_btn[i].addEventListener('click', (event) => {
        change_color('#a3bfff', 100, movie_btn[i].name);
        // color_picker[i].value = '#a3bfff'
    })
}
