$( document ).ready(function() {
    $("#symbol").focus();

    $("#symbol").on('keyup', function (e) {
      if (e.key === 'Enter' || e.keyCode === 13) {
        handleSubmit();
      }
    });
    $( "#ok_btn" ).click(function() {
        handleSubmit();
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
    chrome.tabs.create({"url": "https://seekingalpha.com/symbol/"+ $("#symbol").val().trim() + "/earnings"});
}
