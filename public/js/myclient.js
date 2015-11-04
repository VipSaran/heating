$.ajaxSetup({
  timeout: 20000
});

var lastRefreshed = new Date().toLocaleString(); // fresh temp readout or fresh graph
var dataRefreshInterval;
var dataRefreshTimeout;

var getImage = function(cb) {
  var url = document.URL + 'refresh_image';
  console.log('URL=', url);
  $.ajax({
    url: url,
    dataType: "json",
    success: function(data, textStatus, jqXHR) {
      console.log('/refresh_image API response received:', data);
      if (data) {
        var d = new Date();
        var img_day = $('#graph_day > img')
        img_day.attr('src', img_day.attr('src') + '?' + d.getMilliseconds());

        var img_hour = $('#graph_hour > img')
        img_hour.attr('src', img_hour.attr('src') + '?' + d.getMilliseconds());

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
};

var getState = function() {
  var url = document.URL + 'get_state';
  console.log('URL=', url);
  $.ajax({
    url: url,
    dataType: "json",
    success: function(data, textStatus, jqXHR) {
      console.log('/get_state API response received:', data);

      refreshValues(data);
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
};

var refreshAll = function() {
  clearTimeout(dataRefreshTimeout);
  dataRefreshTimeout = setTimeout(function() {
    refreshAll();
  }, 300000); // 300.000 = 300 s = 5 min

  $('#progress').modal({
    show: true,
    keyboard: false,
    backdrop: true
  });

  getImage(getState);
};

var setPresetTemp = function(value) {
  var url = document.URL + 'set_preset_temp/' + value;
  console.log('URL=', url);
  $.ajax({
    url: url,
    dataType: "json",
    success: function(data, textStatus, jqXHR) {
      console.log('/set_preset_temp API response received:', data);

      refreshValues(data);
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
};

var switchOverride = function() {
  var state = getOverrideSwitchBinaryState();
  var url = document.URL + 'switch_override/' + state;
  console.log('URL=', url);
  $.ajax({
    url: url,
    dataType: "json",
    success: function(data, textStatus, jqXHR) {
      console.log('/switch_override API response received:', data);

      refreshValues(data);
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
};

var switchSkipCurrent = function() {
  var state = getSkipCurrentSwitchBinaryState();
  var url = document.URL + 'switch_skip_current/' + state;
  console.log('URL=', url);
  $.ajax({
    url: url,
    dataType: "json",
    success: function(data, textStatus, jqXHR) {
      console.log('/switch_skip_current API response received:', data);

      refreshValues(data);
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
};

var switchHeating = function() {
  var state = getHeatingSwitchBinaryState();
  var url = document.URL + 'switch_heating/' + state;
  console.log('URL=', url);
  $.ajax({
    url: url,
    dataType: "json",
    success: function(data, textStatus, jqXHR) {
      console.log('/switch_heating API response received:', data);

      refreshValues(data);
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
};

var switchHoliday = function() {
  var state = getHolidaySwitchBinaryState();
  var url = document.URL + 'switch_holiday/' + state;
  console.log('URL=', url);
  $.ajax({
    url: url,
    dataType: "json",
    success: function(data, textStatus, jqXHR) {
      console.log('/switch_holiday API response received:', data);

      refreshValues(data);
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
};

function refreshValues(data) {
  $("#temp_osijek").html(data.temp_osijek);
  $("#temp_preset").html(data.temp_preset);
  $("#temp_living").html(data.temp_living);

  $("input#overrideswitch").prop('checked', data.overrideSwitch);
  $("input#skipcurrentswitch").prop('checked', data.skipCurrentSwitch);
  $("input#myonoffswitch").prop('checked', data.heatingSwitch);
  $("input#holidayswitch").prop('checked', data.holidaySwitch);

  if (data.overrideSwitch) {
    $('#temp_preset_inc').removeClass('hidden');
    $('#temp_preset_dec').removeClass('hidden');
  } else {
    $('#temp_preset_inc').addClass('hidden');
    $('#temp_preset_dec').addClass('hidden');
  }

  lastRefreshed = new Date().toLocaleString();
  $('#log').html('Posljednji puta osvježeno: ' + lastRefreshed);
}

var getOverrideSwitchBinaryState = function() {
  return isOverrideSwitchOn() ? 1 : 0;
}
var isOverrideSwitchOn = function() {
  return $("input#overrideswitch").is(":checked");
}

var getSkipCurrentSwitchBinaryState = function() {
  return isSkipCurrentSwitchOn() ? 1 : 0;
}
var isSkipCurrentSwitchOn = function() {
  return $("input#skipcurrentswitch").is(":checked");
}

var getHeatingSwitchBinaryState = function() {
  return isHeatingSwitchOn() ? 1 : 0;
}
var isHeatingSwitchOn = function() {
  return $("input#myonoffswitch").is(":checked");
}

var getHolidaySwitchBinaryState = function() {
  return isHolidaySwitchOn() ? 1 : 0;
}
var isHolidaySwitchOn = function() {
  return $("input#holidayswitch").is(":checked");
}

$(document).ready(function() {
  $('.carousel').carousel({
    interval: false
  });

  $(".carousel-control").hover(function() {
    $(this).toggleClass('is-hover');
  });

  refreshAll();

  $("#temperatures_graph").click(function() {
    if (!$('.carousel-control').hasClass('is-hover')) {
      refreshAll();
    }
  });

  $('#temp_preset_dec').click(function() {
    setPresetTemp('dec');
  });

  $('#temp_preset_inc').click(function() {
    setPresetTemp('inc');
  });

  $('#overrideswitch').on("click", function(event) {
    event.preventDefault();
    switchOverride();
  });

  $('#skipcurrentswitch').on("click", function(event) {
    event.preventDefault();
    switchSkipCurrent();
  });

  $('#myonoffswitch').on("click", function(event) {
    event.preventDefault();
    switchHeating();
  });

  $('#holidayswitch').on("click", function(event) {
    event.preventDefault();
    switchHoliday();
  });

  $('#error_close').click(function() {
    $(this).parent().removeClass('in');
    $(this).parent().addClass('hidden');
  });
});