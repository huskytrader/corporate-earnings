//options
var enable_copy_on_click = false;
// chart type: 1=desc first sentence, 2=full desc
var data_to_copy = 1;
var fetch_fundamental_data = false;
// chart type: 1=none, 2=weekly, 3=daily, 4=both
var chart_type = 1;
var show_earnings_surprise = false;
var open_new_tab = false;
var ms_style_output = true;
var limit_num_qtr = true;
var default_ds = 1;


$(document).ready(init);

function init() {
  restore_options();
}

// Restores checkbox state using the options stored in chrome.storage.
function restore_options() {
  chrome.storage.local.get(['enable_copy_on_click', 'data_to_copy', 'chart_type', 
                            'fetch_fundamental_data', 'show_earnings_surprise', 'open_new_tab', 
                            'ms_style_output', 'limit_num_qtr', 'default_ds'], function(options) {
    if (isDefined(options.enable_copy_on_click)) {enable_copy_on_click = options.enable_copy_on_click;}
    if (isDefined(options.data_to_copy)) {data_to_copy = options.data_to_copy;}
    if (isDefined(options.fetch_fundamental_data)) {fetch_fundamental_data = options.fetch_fundamental_data;}
    if (isDefined(options.chart_type)) {chart_type = options.chart_type;}
    if (isDefined(options.show_earnings_surprise)) {show_earnings_surprise = options.show_earnings_surprise;}
    if (isDefined(options.open_new_tab)) {open_new_tab = options.open_new_tab;}
    if (isDefined(options.ms_style_output)) {ms_style_output = options.ms_style_output;}
    if (isDefined(options.limit_num_qtr)) {limit_num_qtr = options.limit_num_qtr;}
    if (isDefined(options.default_ds)) {default_ds = options.default_ds;}

    restore_ui();
  });
}

function restore_ui() {
  $('#enable_copy_on_click').prop('checked', enable_copy_on_click);
  $('#copy_type_'+data_to_copy).prop('checked', true);
  $('#fetch_fundamental_data').prop('checked', fetch_fundamental_data);
  $('#chart_type_'+chart_type).prop('checked', true);
  $('#show_earnings_surprise').prop('checked', show_earnings_surprise);
  $('#open_new_tab').prop('checked', open_new_tab);
  $('#ms_style_output').prop('checked', ms_style_output);
  $('#limit_num_qtr').prop('checked', limit_num_qtr);
  if (default_ds == 2) {
    $('#ds_two').prop('checked', true);
  }
  else {
    $('#ds_one').prop('checked', true);
  }

  // attach event handlers
  $('.checkbox').change(save_options);
  $('#ds-switch').change(save_options);
  $('#chart-select').change(save_options);
  $('#copy-on-click-select').change(save_options);

  // set version
  $('#version').text(chrome.runtime.getManifest().version);

  // show/hide chart selector
  if (fetch_fundamental_data == true) {
    $('#chart-select').show();
  }
  else {
    $('#chart-select').hide();
  }

  // show/hide copy selector
  if (enable_copy_on_click == true) {
    $('#copy-on-click-select').show();
  }
  else {
    $('#copy-on-click-select').hide();
  }
}

// Saves options to storage
function save_options() {
  let enable_copy_on_click = $('#enable_copy_on_click').is(":checked");
  let fetch_fundamental_data = $('#fetch_fundamental_data').is(":checked");
  let show_earnings_surprise = $('#show_earnings_surprise').is(":checked");
  let open_new_tab = $('#open_new_tab').is(":checked");
  let ms_style_output = $('#ms_style_output').is(":checked");
  let limit_num_qtr = $('#limit_num_qtr').is(":checked");
  let default_ds = 1;
  if ($('#ds_one').is(":checked")) {
    default_ds = 1;
  }
  else if ($('#ds_two').is(":checked")) {
    default_ds = 2;
  }
  let chart_type = $("input[name='chart']:checked").val();
  let copy_type = $("input[name='copy']:checked").val();
  
  chrome.storage.local.set({
    enable_copy_on_click: enable_copy_on_click,
    data_to_copy: copy_type,
    chart_type: chart_type,
    fetch_fundamental_data: fetch_fundamental_data,
    show_earnings_surprise: show_earnings_surprise,
    open_new_tab: open_new_tab,
    ms_style_output: ms_style_output,
    limit_num_qtr: limit_num_qtr,
    default_ds: default_ds
  });

  if (fetch_fundamental_data == false) {
    $('#chart-select').hide();
  }
  else {
    $('#chart-select').show();
  }

   // show/hide copy selector
  if (enable_copy_on_click == false) {
    $('#copy-on-click-select').hide();
  }
  else {
    $('#copy-on-click-select').show();
  }
}

function isDefined(smth) {
    return typeof smth !== 'undefined';
}
