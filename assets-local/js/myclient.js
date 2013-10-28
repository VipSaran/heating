$.ajaxSetup({
  timeout: 10000
});

var lastRefreshed = new Date().toLocaleString(); // fresh temp readout or fresh graph
var dataRefreshInterval;
var dataRefreshTimeout;

var refreshImage = function(cb) {
  var url = document.URL + 'refresh_image';
  console.log('URL=', url);
  $.ajax({
    url: url,
    dataType: "json",
    success: function(data, textStatus, jqXHR) {
      console.log('/refresh_image API response received:', data);
      if (data) {
        $("#graph_day").html($("<img />", {
          src: "assets-local/img/temperatures_graph.png",
          title: "dnevni pogled"
        }));
        $("#graph_week").html($("<img />", {
          src: "assets-local/img/temperatures_graph_week.png",
          title: "tjedni pogled"
        }));
        $("#graph_month").html($("<img />", {
          src: "assets-local/img/temperatures_graph_month.png",
          title: "mjesecni pogled"
        }));
        $("#graph_hour").html($("<img />", {
          src: "assets-local/img/temperatures_graph_hour.png",
          title: "pogled kroz jedan sat"
        }));
        lastRefreshed = new Date().toLocaleString();
      }
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.error(textStatus, errorThrown);
      if (textStatus === "timeout") {
        clearTimeout(dataRefreshTimeout);
        $('#error_text').html('Pre dugo je vremena proteklo bez odgovora servera. Automatsko osvježavanje isključeno.');
      } else {
        $('#error_text').html(errorThrown);
      }
      $('#error').removeClass('hidden').addClass('in');
    },
    complete: function(jqXHR, textStatus) {
      if (typeof(cb) == "function") {
        cb();
      }
    }
  });
}

var refreshTemps = function() {
  var url = document.URL + 'get_temps';
  console.log('URL=', url);
  $.ajax({
    url: url,
    dataType: "json",
    success: function(data, textStatus, jqXHR) {
      console.log('/get_temps API response received:', data);

      $("#temp_osijek").html(data.temp_osijek);
      $("#temp_preset").html(data.temp_preset);
      $("#temp_living").html(data.temp_living);

      lastRefreshed = new Date().toLocaleString();
      $('#log').html('Posljednji puta osvježeno: ' + lastRefreshed);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.error(textStatus, errorThrown);
      if (textStatus === "timeout") {
        clearTimeout(dataRefreshTimeout);
        $('#error_text').html('Pre dugo je vremena proteklo bez odgovora servera. Automatsko osvježavanje isključeno.');
      } else {
        $('#error_text').html(errorThrown);
      }
      $('#error').removeClass('hidden').addClass('in');
    },
    complete: function(jqXHR, textStatus) {
      $('#progress').modal('hide');
    }
  });
}

var refreshData = function() {
  clearTimeout(dataRefreshTimeout);
  dataRefreshTimeout = setTimeout(function() {
    refreshData();
  }, 300000); // 300.000 = 300 s = 5 min

  $('#progress').modal({
    show: true,
    keyboard: false,
    backdrop: true
  });

  refreshImage(refreshTemps);
}

var setPresetTemp = function(value) {
  var url = document.URL + 'set_preset_temp/' + value;
  console.log('URL=', url);
  $.ajax({
    url: url,
    dataType: "json",
    success: function(data, textStatus, jqXHR) {
      console.log('/set_preset_temp API response received:', data);
      $("#temp_osijek").html(data.temp_osijek);
      $("#temp_preset").html(data.temp_preset);
      $("#temp_living").html(data.temp_living);

      lastRefreshed = new Date().toLocaleString();
      $('#log').html('Posljednji puta osvježeno: ' + lastRefreshed);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.error(textStatus, errorThrown);
      // console.error(jqXHR.statusText);
      if (textStatus === "timeout") {
        clearTimeout(dataRefreshTimeout);
        $('#error_text').html('Pre dugo je vremena proteklo bez odgovora servera. Automatsko osvježavanje isključeno.');
      } else {
        $('#error_text').html('Za odabranu funkciju potrebno je odobrenje.');
      }
      $('#error').removeClass('hidden').addClass('in');
    }
  });
}

var updateSwitchState = function() {
  var url = document.URL + 'get_heating_switch';
  console.log('URL=', url);
  $.ajax({
    url: url,
    dataType: "json",
    success: function(data, textStatus, jqXHR) {
      console.log('/get_heating_switch API response received:', data);
      $("input#myonoffswitch").prop('checked', data);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.error(textStatus, errorThrown);
      // console.error(jqXHR.statusText);
      if (textStatus === "timeout") {
        clearTimeout(dataRefreshTimeout);
        $('#error_text').html('Pre dugo je vremena proteklo bez odgovora servera. Automatsko osvježavanje isključeno.');
      } else {
        $('#error_text').html(errorThrown);
      }
      $('#error').removeClass('hidden').addClass('in');
    }
  });
}

var switchHeating = function() {
  var state = getSwitchBinaryState();
  var url = document.URL + 'switch_heating/' + state;
  console.log('URL=', url);
  $.ajax({
    url: url,
    dataType: "json",
    success: function(data, textStatus, jqXHR) {
      console.log('/switch_heating API response received:', data);
      $("input#myonoffswitch").prop('checked', data);
    },
    error: function(jqXHR, textStatus, errorThrown) {
      console.error(textStatus, errorThrown);
      // console.error(jqXHR.statusText);
      if (textStatus === "timeout") {
        clearTimeout(dataRefreshTimeout);
        $('#error_text').html('Pre dugo je vremena proteklo bez odgovora servera. Automatsko osvježavanje isključeno.');
      } else {
        $('#error_text').html('Za odabranu funkciju potrebno je odobrenje.');
      }
      $('#error').removeClass('hidden').addClass('in');
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
  $('.carousel').carousel();

  $(".carousel-control").hover(function() {
    $(this).toggleClass('is-hover');
  });

  updateSwitchState();

  refreshData();

  $("#temperatures_graph").click(function() {
    if (!$('.carousel-control').hasClass('is-hover')) {
      refreshData();
    }
  });

  $('#temp_preset_dec').click(function() {
    setPresetTemp('dec');
  });

  $('#temp_preset_inc').click(function() {
    setPresetTemp('inc');
  });

  $('#myonoffswitch').on("click", function(event) {
    event.preventDefault();
    switchHeating();
  });

  $('#error_close').click(function() {
    $(this).parent().removeClass('in');
    $(this).parent().addClass('hidden');
  });
});