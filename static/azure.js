

function sendCommand(red, green, blue, name) {
   let xhr = new XMLHttpRequest();
   // xhr.open("POST", "https://momagiclight.azurewebsites.net/led");
   xhr.open("POST", "/led");
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

function sendSchedule(red, green, blue, name, UTC, datetime, freq, freq_value) {
   let xhr = new XMLHttpRequest();
   xhr.open("POST", "/schedule");
   // xhr.open("POST", "http://127.0.0.1:5000/schedule");
   xhr.setRequestHeader("Content-Type", "application/json");

   xhr.onload = () => {
      if (xhr.responseText == "400") {
         window.location.reload()
      }
   };

   let data = `{
"request": "${red},${green},${blue},${name},${UTC},${freq},${freq_value}",
"local":"${datetime}"
}`;
   xhr.send(data);
}
function schedule(e) {
   e.preventDefault();
   color_hex = document.getElementById("scolor").value;
   device = document.getElementById("sdevice").value;
   datetime = document.getElementById("sdate").value;
   datetime = datetime.replace("T", " ")
   console.log(datetime)
   freq = document.querySelector('input[name="frequency"]:checked').value;
   freq_value = " ";
   if (freq != "one_time") {
      freq_value = document.getElementById(freq + '00').value;
   }
   if (freq == "day") {
      local_time = datetime + "," + freq_value;
      [hours, minutes] = freq_value.split(':');
      date = new Date();
      date.setHours(hours, +minutes);
      timestr = date.toISOString().split("T")[1];
      freq_value = timestr.slice(+0, +5);
   }


   temp_arr = datetime.split(' ');
   dateValues = temp_arr[0];
   timeValues = temp_arr[1];
   [year, month, day] = dateValues.split('-');
   [hours, minutes] = timeValues.split(':');
   date = new Date(+year, month - 1, +day, +hours, +minutes);
   datetimeUTC = date.toISOString()
   console.log(datetime)
   red = Math.round(parseInt(color_hex.slice(1, 3), 16) * 100 / 100);
   green = Math.round(parseInt(color_hex.slice(3, 5), 16) * 100 / 100);
   blue = Math.round(parseInt(color_hex.slice(5, 7), 16) * 100 / 100);
   if (freq == "day") {
      datetime = local_time;
   }
   sendSchedule(red, green, blue, device, datetimeUTC, datetime, freq, freq_value)
   document.getElementById('sche00').style.display = 'none';
   document.getElementById('id04').style.display = 'block';
}
function removeJob(job) {
   let xhr = new XMLHttpRequest();
   xhr.open("POST", "/remove");
   // xhr.open("POST", "http://127.0.0.1:5000/remove");
   xhr.setRequestHeader("Content-Type", "application/json");

   xhr.onload = () => {
      if (xhr.responseText == "400") {
         window.location.reload()
      }
   };

   let data = `{
"request": "${job}"
}`;
   xhr.send(data);
}