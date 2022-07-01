//options
var default_theme = "dark";
var show_earnings_only = false;
// chart type: 1=none, 2=weekly, 3=daily, 4=both
var chart_type = 1;
var show_earnings_surprise = false;
var open_new_tab = false;
var ms_style_output = true;
var limit_num_qtr = true;
var default_ds = 2;

document.addEventListener("DOMContentLoaded", () => {
  restore_options();
});

// Restores checkbox state using the options stored in chrome.storage.
function restore_options() {
  chrome.storage.local.get(['chart_type', 
                            'show_earnings_only', 'show_earnings_surprise', 'open_new_tab', 
                            'ms_style_output', 'limit_num_qtr', 'default_ds', 'theme'], function(options) {
    if (isDefined(options.show_earnings_only)) show_earnings_only = options.show_earnings_only;
    if (isDefined(options.chart_type)) chart_type = options.chart_type;
    if (isDefined(options.show_earnings_surprise)) show_earnings_surprise = options.show_earnings_surprise;
    if (isDefined(options.open_new_tab)) open_new_tab = options.open_new_tab;
    if (isDefined(options.ms_style_output)) ms_style_output = options.ms_style_output;
    if (isDefined(options.limit_num_qtr)) limit_num_qtr = options.limit_num_qtr;
    if (isDefined(options.default_ds)) default_ds = options.default_ds;
    if (isDefined(options.theme)) default_theme = options.theme;
    restore_ui();
  });
}

function restore_ui() {
  document.getElementById('show_earnings_only').checked = show_earnings_only;
  document.getElementById('chart_type_'+chart_type).checked = true;
  document.getElementById('show_earnings_surprise').checked = show_earnings_surprise;
  document.getElementById('open_new_tab').checked = open_new_tab;
  document.getElementById('ms_style_output').checked = ms_style_output;
  document.getElementById('limit_num_qtr').checked = limit_num_qtr;

  if (default_theme === 'dark') 
    document.getElementById('theme_dark').checked = true;
  else 
    document.getElementById('theme_light').checked = true;

  if (default_ds == 2) {
    document.getElementById('ds_two').checked = true;
  }
  else {
    document.getElementById('ds_one').checked = true;
  }

  // attach event handlers
  document.querySelectorAll('.checkbox').forEach((checkbox) => checkbox.addEventListener('change', save_options));
  document.querySelector('#theme-switch').addEventListener('change', save_options);
  document.querySelector('#ds-switch').addEventListener('change', save_options);
  document.querySelector('#chart-select').addEventListener('change', save_options);

  // set version
  document.getElementById('version').innerHTML = chrome.runtime.getManifest().version;

  // gray out chart selector if show_earnings_only is selected
 if (show_earnings_only == false) {
    ungrayDiv(document.getElementById("chart-select"));
  }
  else {
    grayDiv(document.getElementById("chart-select"));
  }
}

// Saves options to storage
function save_options() {
  show_earnings_only = document.getElementById('show_earnings_only').checked;
  show_earnings_surprise = document.getElementById('show_earnings_surprise').checked;
  open_new_tab = document.getElementById('open_new_tab').checked;
  ms_style_output = document.getElementById('ms_style_output').checked;
  limit_num_qtr = document.getElementById('limit_num_qtr').checked;
  if (document.getElementById('ds_one').checked) {
    default_ds = 1;
  }
  else if (document.getElementById('ds_two').checked) {
    default_ds = 2;
  }
  chart_type = document.querySelector('input[name="chart"]:checked').value;
  default_theme = document.querySelector('input[name="theme"]:checked').value;

  chrome.storage.local.set({
    chart_type: chart_type,
    show_earnings_only: show_earnings_only,
    show_earnings_surprise: show_earnings_surprise,
    open_new_tab: open_new_tab,
    ms_style_output: ms_style_output,
    limit_num_qtr: limit_num_qtr,
    default_ds: default_ds,
    theme: default_theme
  });

 if (show_earnings_only == true) {
    grayDiv(document.getElementById("chart-select"));
  }
  else {
    ungrayDiv(document.getElementById("chart-select"));
  }

  // send message to content script to update them
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {theme: default_theme});
  });
}

function isDefined(smth) {
    return typeof smth !== 'undefined';
}

const hide = (element) => {
    if (element != null && element.style != null)
        element.style.display = "none";
};

// show an element
const show = (element) => {
    if (element != null && element.style != null)
        element.style.display = "block";    
};

const grayDiv = (element) => {
  element.style.opacity = 0.5;
  element.style.pointerEvents = 'none';
};

const ungrayDiv = (element) => {
  element.style.opacity = 1.0;
  element.style.pointerEvents = 'auto';
};
