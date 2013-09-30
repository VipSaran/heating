var lastRefreshed = new Date().toLocaleString(); // fresh temp readout or fresh graph
var dataRefreshInterval;

$('#myonoffswitch').click(function() {
  var state = getSwitchBinaryState();
  var url = document.URL + 'set_heating/' + state;
  console.log('URL=' + url);
  $.getJSON(url, function(data) {
    console.log('/set_heating API response received');
  });
});

var updateSwitchState = function() {
  var url = document.URL + 'get_heating';
  console.log('URL=' + url);
  $.getJSON(url, function(state) {
    console.log('/get_heating API response received: ' + state);
    $("input#myonoffswitch").prop('checked', state);
  });
}

var refreshImage = function() {
  $('#progress').modal({
    show: true,
    keyboard: false,
    backdrop: true
  });

  var url = document.URL + 'refresh_image';
  console.log('URL=' + url);
  $.getJSON(url, function(updated) {
    console.log('/refresh_image API response received: ' + updated);
    if (updated) {
      $("#temperatures_graph").html($("<img />", {
        src: "assets-local/img/temperatures_graph.png"
      }));
      lastRefreshed = new Date().toLocaleString();
      $('#progress').modal('hide');
    } else {
      setTimeout(function() {
        $('#progress').modal('hide');
      }, 500);
    }
    $('#log').html('Posljednji puta osvježeno: ' + lastRefreshed);
  });
}

var refreshTemps = function() {
  $('#progress').modal({
    show: true,
    keyboard: false,
    backdrop: true
  });

  var url = document.URL + 'get_temps';
  console.log('URL=' + url);
  $.getJSON(url, function(data) {
    console.log('/get_temps API response received: ' + data);

    $("#temp_osijek").html(data.temp_osijek);
    $("#temp_preset").html(data.temp_preset);
    $("#temp_living").html(data.temp_living);

    lastRefreshed = new Date().toLocaleString();
    $('#progress').modal('hide');
    $('#log').html('Posljednji puta osvježeno: ' + lastRefreshed);
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

  refreshImage();
  refreshTemps();
  
  dataRefreshInterval = setInterval(function() {
    refreshImage();
    refreshTemps();
  }, 300000); // 300.000 = 300 s = 5 min

  $("#temperatures_graph img").click(function() {
    refreshImage();
  });
});