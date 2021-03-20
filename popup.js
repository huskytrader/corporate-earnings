const urlPrefix = "aHR0cHM6Ly9zZWVraW5nYWxwaGEuY29tL3N5bWJvbC8=";
var open_new_tab = true;
chrome.storage.local.get(['open_new_tab', 'ms_style_output', 'limit_num_qtr'], function(options) {
    if (isDefined(options.open_new_tab)) {open_new_tab = options.open_new_tab;}
});

$( document ).ready(function() {
    $("#symbol").focus();
    $("#symbol").on('keyup', function (e) {
      if (e.key === 'Enter' || e.keyCode === 13) {
        handleSubmit();
      }
    });
});

function handleSubmit() {
    let stockRegex = /^[a-zA-Z\s]*$/;
    let symbol = $("#symbol").val().trim();
    if (symbol==null || symbol=="") {
        alert("Symbol must not be blank");
        return;
    }
    else if (!stockRegex.test(symbol)) {
        alert("Symbol must only contain characters");
        return;
    }

    let targetUrl = decodeURIComponent(escape(window.atob(urlPrefix))) + symbol.toUpperCase() + "/earnings";
    if (open_new_tab) {
        chrome.tabs.create({"url": targetUrl});
    }
    else {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            let tab = tabs[0];
            chrome.tabs.update(tab.id, {url: targetUrl});
        });
        $("#symbol").select();
    }
}

function isDefined(smth) {
    return typeof smth !== 'undefined';
}
