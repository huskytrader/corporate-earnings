
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
        chrome.tabs.create({"url": "https://seekingalpha.com/symbol/"+ $("#symbol").val().trim() + "/earnings"});
    }
