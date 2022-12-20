

function sendCommand(red, green, blue, name) {
   let xhr = new XMLHttpRequest();
   xhr.open("POST", "https://momagiclight.azurewebsites.net/led");
   // xhr.open("POST", "http://127.0.0.1:5000/led");
   xhr.setRequestHeader("Content-Type", "application/json");

   xhr.onload = () => {
      if (xhr.responseText == "400") {
         window.location.reload()
      }
   };

   let data = `{
 "request": "${red},${green},${blue},${name}"
}`;
   xhr.send(data);
}

// Led Controller
function change_color(color_hex, bright, name) {
   if (color_hex.slice(0, 1) != "#") {
      sendCommand(color_hex, 0, 0, name);
      console.log(color_hex)
   } else {
      red = Math.round(parseInt(color_hex.slice(1, 3), 16) * bright / 100);
      green = Math.round(parseInt(color_hex.slice(3, 5), 16) * bright / 100);
      blue = Math.round(parseInt(color_hex.slice(5, 7), 16) * bright / 100);
      console.log(`${red}, ${green}, ${blue}`)

      sendCommand(red, green, blue, name);
   }
}

function sendSchedule(red, green, blue, name, datetime, freq, freq_value) {
   let xhr = new XMLHttpRequest();
   xhr.open("POST", "https://momagiclight.azurewebsites.net/schedule");
   // xhr.open("POST", "http://127.0.0.1:5000/schedule");
   xhr.setRequestHeader("Content-Type", "application/json");

   xhr.onload = () => {
      if (xhr.responseText == "400") {
         window.location.reload()
      }
   };

   let data = `{
"request": "${red},${green},${blue},${name},${datetime},${freq},${freq_value}"
}`;
   xhr.send(data);
}
function schedule(e) {
   e.preventDefault();
   color_hex = document.getElementById("scolor").value;
   device = document.getElementById("sdevice").value;
   datetime = document.getElementById("sdate").value;
   freq = document.querySelector('input[name="frequency"]:checked').value;
   freq_value = " ";
   if (freq != "one_time") {
      freq_value = document.getElementById(freq + '00').value;
   }


   temp_arr = datetime.split('T');
   dateValues = temp_arr[0];
   timeValues = temp_arr[1];
   [year, month, day] = dateValues.split('-');
   [hours, minutes] = timeValues.split(':');
   date = new Date(+year, month - 1, +day, +hours, +minutes);
   datetime = date.toISOString()
   red = Math.round(parseInt(color_hex.slice(1, 3), 16) * 100 / 100);
   green = Math.round(parseInt(color_hex.slice(3, 5), 16) * 100 / 100);
   blue = Math.round(parseInt(color_hex.slice(5, 7), 16) * 100 / 100);
   sendSchedule(red, green, blue, device, datetime, freq, freq_value)
   document.getElementById('sche00').style.display = 'none'
   document.getElementById('id04').style.display = 'block'
}