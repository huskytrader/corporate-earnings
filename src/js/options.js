//options
var fetch_fundamental_data = false;
// chart type: 1=none, 2=weekly, 3=daily, 4=both
var chart_type = 1;
var show_earnings_surprise = false;
var open_new_tab = false;
var ms_style_output = true;
var limit_num_qtr = true;
var default_ds = 1;

document.addEventListener("DOMContentLoaded", () => {
  restore_options();
});

// Restores checkbox state using the options stored in chrome.storage.
function restore_options() {
  chrome.storage.local.get(['chart_type', 
                            'fetch_fundamental_data', 'show_earnings_surprise', 'open_new_tab', 
                            'ms_style_output', 'limit_num_qtr', 'default_ds'], function(options) {
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
  document.getElementById('fetch_fundamental_data').checked = fetch_fundamental_data;
  document.getElementById('chart_type_'+chart_type).checked = true;
  document.getElementById('show_earnings_surprise').checked = show_earnings_surprise;
  document.getElementById('open_new_tab').checked = open_new_tab;
  document.getElementById('ms_style_output').checked = ms_style_output;
  document.getElementById('limit_num_qtr').checked = limit_num_qtr;
  if (default_ds == 2) {
    document.getElementById('ds_two').checked = true;
  }
  else {
    document.getElementById('ds_one').checked = true;
  }

  // attach event handlers
  document.querySelector('.checkbox').addEventListener('change', save_options);
  document.querySelector('#ds-switch').addEventListener('change', save_options);
  document.querySelector('#chart-select').addEventListener('change', save_options);

  // set version
  document.getElementById('version').innerHTML = chrome.runtime.getManifest().version;

  // show/hide chart selector
  if (fetch_fundamental_data == true) {
    show(document.getElementById("chart-select"));
  }
  else {
    hide(document.getElementById("chart-select"));
  }
}

// Saves options to storage
function save_options() {
  let fetch_fundamental_data = document.getElementById('fetch_fundamental_data').checked;
  let show_earnings_surprise = document.getElementById('show_earnings_surprise').checked;
  let open_new_tab = document.getElementById('open_new_tab').checked;
  let ms_style_output = document.getElementById('ms_style_output').checked;
  let limit_num_qtr = document.getElementById('limit_num_qtr').checked;
  let default_ds = 1;
  if (document.getElementById('ds_one').checked) {
    default_ds = 1;
  }
  else if (document.getElementById('ds_two').checked) {
    default_ds = 2;
  }
  let chart_type = document.querySelector('input[name="chart"]:checked').value;
  
  chrome.storage.local.set({
    chart_type: chart_type,
    fetch_fundamental_data: fetch_fundamental_data,
    show_earnings_surprise: show_earnings_surprise,
    open_new_tab: open_new_tab,
    ms_style_output: ms_style_output,
    limit_num_qtr: limit_num_qtr,
    default_ds: default_ds
  });

  if (fetch_fundamental_data == false) {
    hide(document.getElementById("chart-select"));
  }
  else {
    show(document.getElementById("chart-select"));
  }
}

function isDefined(smth) {
    return typeof smth !== 'undefined';
}

const hide = (element) => {
    if (element != null && element.style != null)
        element.style.display = "none";
}

// show an element
const show = (element) => {
    if (element != null && element.style != null)
        element.style.display = "block";    
}
