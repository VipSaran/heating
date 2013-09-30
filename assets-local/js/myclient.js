var lastRefreshed = new Date().toLocaleString(); // fresh temp readout or fresh graph
var dataRefreshInterval;

var refreshImage = function(cb) {
  var url = document.URL + 'refresh_image';
  console.log('URL=' + url);
  $.getJSON(url, function(updated) {
    console.log('/refresh_image API response received: ' + updated);
    if (updated) {
      $("#temperatures_graph").html($("<img />", {
        src: "assets-local/img/temperatures_graph.png"
      }));
      lastRefreshed = new Date().toLocaleString();
    }

    if (typeof(cb) == "function") {
      cb();
    }
  });
}

var refreshTemps = function() {
  var url = document.URL + 'get_temps';
  console.log('URL=' + url);
  $.getJSON(url, function(data) {
    console.log('/get_temps API response received: ' + JSON.stringify(data));

    $("#temp_osijek").html(data.temp_osijek);
    $("#temp_preset").html(data.temp_preset);
    $("#temp_living").html(data.temp_living);

    lastRefreshed = new Date().toLocaleString();
    $('#progress').modal('hide');
    $('#log').html('Posljednji puta osvježeno: ' + lastRefreshed);
  });
}

var refreshData = function() {
  $('#progress').modal({
    show: true,
    keyboard: false,
    backdrop: true
  });

  refreshImage(refreshTemps);
}

var setPresetTemp = function(value) {
  var url = document.URL + 'set_preset_temp/' + value;
  console.log('URL=' + url);
  $.getJSON(url, function(data) {
    console.log('/set_preset_temp API response received');
    $("#temp_osijek").html(data.temp_osijek);
    $("#temp_preset").html(data.temp_preset);
    $("#temp_living").html(data.temp_living);

    lastRefreshed = new Date().toLocaleString();
    $('#log').html('Posljednji puta osvježeno: ' + lastRefreshed);
  });
}

var updateSwitchState = function() {
  var url = document.URL + 'get_heating';
  console.log('URL=' + url);
  $.getJSON(url, function(state) {
    console.log('/get_heating API response received: ' + state);
    $("input#myonoffswitch").prop('checked', state);
  });
}

var setSwitchState = function() {
  var state = getSwitchBinaryState();
  var url = document.URL + 'set_heating/' + state;
  console.log('URL=' + url);
  $.getJSON(url, function(data) {
    console.log('/set_heating API response received');
  });
}

var getSwitchBinaryState = function() {
  return isSwitchOn() ? 1 : 0;
}

var isSwitchOn = function() {
  return $("input#myonoffswitch").is(":checked");
}


$(document).ready(function() {
  updateSwitchState();

  refreshData();

  dataRefreshInterval = setInterval(function() {
    refreshData();
  }, 300000); // 300.000 = 300 s = 5 min

  $("#temperatures_graph").click(function() {
    refreshData();
  });

  $('#temp_preset_dec').click(function() {
    setPresetTemp('dec');
  });

  $('#temp_preset_inc').click(function() {
    setPresetTemp('inc');
  });

  $('#myonoffswitch').click(function() {
    setSwitchState();
  });
});