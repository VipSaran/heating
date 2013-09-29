$('#myonoffswitch').click(function() {
  var state = getSwitchBinaryState();
  var url = document.URL + 'set/' + state;
  console.log('URL=' + url);
  $.getJSON(url, function(data) {
    console.log('set API response received');
    $('#output').append('<p>' + new Date().toLocaleString() + ': state changed to ' + state + '.</p>');
    updateLED();
  });
});

var updateLED = function(initial) {
  var url = document.URL + 'get';
  console.log('URL=' + url);
  $.getJSON(url, function(data) {
    console.log('get API response received: ' + data['value']);
    if (data['value'] == 1) {
      $('#led').addClass('on');
      if (initial) {
        $("input#myonoffswitch").prop('checked', true);
      }
    } else {
      $('#led').removeClass('on');
    }
  });
}

var getSwitchBinaryState = function() {
  return isSwitchOn() ? 1 : 0;
}

var isSwitchOn = function() {
  return $("input#myonoffswitch").is(":checked");
}

$(document).ready(function() {
  updateLED(true);
});