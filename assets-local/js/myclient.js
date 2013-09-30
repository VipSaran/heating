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
      $('#log').html('Posljednji puta osvježeno: ' + new Date().toLocaleString());
      $('#progress').modal('hide');
    } else {
      setTimeout(function() {
        $('#progress').modal('hide');
      }, 500);
      $('#log').html('Posljednji puta osvježeno: ' + new Date().toLocaleString());
    }
  });
}

var getSwitchBinaryState = function() {
  return isSwitchOn() ? 1 : 0;
}

var isSwitchOn = function() {
  return $("input#myonoffswitch").is(":checked");
}

var imgRefreshInterval;
$(document).ready(function() {

  updateSwitchState();

  refreshImage();
  imgRefreshInterval = setInterval(function() {
    refreshImage();
  }, 300000); // 300.000 = 300 s = 5 min

  $("#temperatures_graph img").click(function() {
    refreshImage();
  });
});