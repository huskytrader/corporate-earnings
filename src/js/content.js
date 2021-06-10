// constants
const CHANGE_POSITIVE_COLOR = '#0000FF';
const CHANGE_NEGATIVE_COLOR = '#FF0000';
const SURPRISE_POSITIVE_COLOR = '#04C90A';

const LOW_ADR_THRESHOLD = 4.5;
const LOW_ADR_COLOR = '#FF0000';

const HIGH_SHORT_INTEREST_THRESHOLD = 20;
const HIGH_SHORT_INTEREST_COLOR = '#FF0000';

const DAYS_BEFORE_EARNINGS_WARN_THRESHOLD = 3;
const DAYS_BEFORE_EARNINGS_WARN_COLOR = '#FF0000';

const MONTH_MAP = {
    1: 'Jan',
    2: 'Feb',
    3: 'Mar',
    4: 'Apr',
    5: 'May',
    6: 'Jun',
    7: 'Jul',
    8: 'Aug',
    9: 'Sep',
    10: 'Oct',
    11: 'Nov',
    12: 'Dec'
};

const REVERSE_MONTH_MAP = {
    'Jan': 0,
    'Feb': 1,
    'Mar': 2,
    'Apr': 3,
    'May': 4,
    'Jun': 5,
    'Jul': 6,
    'Aug': 7,
    'Sep': 8,
    'Oct': 9,
    'Nov': 10,
    'Dec': 11
};

const CHART_TYPE = {
    NONE: 1,
    WEEKLY : 2,
    DAILY: 3,
    BOTH: 4
};
Object.freeze(CHART_TYPE);

// init options to default values
var fetch_fundamental_data = false;
var chart_type = 1;
var show_earnings_surprise = false;
var default_ds = 1;
var ms_style_output = true;
var limit_num_qtr = true;

// init data structures
var epsDates = [];
var annualEst = [];
var fundamentals = [];

chrome.storage.local.get(['chart_type', 
                          'fetch_fundamental_data', 
                          'show_earnings_surprise', 
                          'ms_style_output', 
                          'limit_num_qtr', 
                          'default_ds'], 
                          function(options) {
    if (isDefined(options.fetch_fundamental_data)) { fetch_fundamental_data = options.fetch_fundamental_data; }
    if (isDefined(options.chart_type)) { chart_type = options.chart_type; }
    if (isDefined(options.show_earnings_surprise)) { show_earnings_surprise = options.show_earnings_surprise; }
    if (isDefined(options.default_ds)) { default_ds = options.default_ds; } 
    if (isDefined(options.ms_style_output)) { ms_style_output = options.ms_style_output; }
    if (isDefined(options.limit_num_qtr)) { limit_num_qtr = options.limit_num_qtr; }

    if (fetch_fundamental_data == true) {
        chrome.runtime.sendMessage({chart_type: chart_type}, (response) => {
            if (!response.error) {
                fundamentals.push(response); 
                waitForEl("#h_earnings", displayFundamentals, 30); 
            }
        })
    }

    prepare();
    displayWaiting();

    if (default_ds == 1) {
        // SA
        const noData = $(document).find('#history .no-data').length == 1;
        if(noData) {
            $('#waiting').hide();
            $('body').prepend('<div class="mymsg">No earnings data available for this symbol.</div>');
            return;
        }   
        waitForEl("div.earning-title", displayEarnings, 30);
    }
    else if (default_ds == 2) {
        // ZA
        extractAndProcess();
        displayContent();
    }
 });

//
// end of main
//

/**
 * Wait for the specified element to appear in the DOM. When the element appears,
 * provide it to the callback. Will wait additional 250ms where callback.
 *
 * @param selector a jQuery selector (eg, 'div.container img')
 * @param callback function that takes selected element (null if timeout)
 * @param maxtries number of times to try (return null after maxtries, false to disable, if 0 will still try once)
 * @param interval ms wait between each try
 */
function waitForEl(selector, callback, maxtries = false, interval = 100) {
  const poller = setInterval(() => {
    const el = jQuery(selector);
    const retry = maxtries === false || maxtries-- > 0;
    if (retry && el.length < 1) return; // will try again
    clearInterval(poller);
    setTimeout(function() {
            callback(el || null);
    }, 250);
  }, interval);
}

function displayFundamentals(el) {
    if (fundamentals.length > 0) {
       $('<div class="container"><div colspan="2" class="column">' + fundamentalsToHtml(fundamentals[0]) + '</div></div>').insertAfter('#h_earnings');  
    } 
}

function displayEarnings(el) {
    if(el == null) {
        $('#waiting').hide();
        $('body').prepend('<div class="mymsg">No earnings data available for this symbol.</div>');
        return;
    }
    extractAndProcess();
    displayContent();
}

function displayWaiting() {
    $('body').prepend('<div class="container" id="waiting"><p class="loading_msg">Loading earnings data</p></div>');
}

function prepare() {
    const css = `<style>
    .mymsg, #waiting {
       padding: 20px;
       font-size: 1em;
       font-style: italic;
    }
    .myt {
       float: left;
       border-collapse: collapse;
       margin: 25px ${show_earnings_surprise ? 20 : 50}px 25px 0px;
       padding-left: 5px;
       font-family: sans-serif;
       min-width: 400px;
       box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
    }
    .myt thead tr {
       background-color: #333333;
       color: #ffffff;
       ${show_earnings_surprise ? 'font-size: 0.80em;' : ''}
       text-align: left;
    }
    .myt th,
    .myt td {
       padding: 12px ${show_earnings_surprise ? 8 : 12}px;
    }
    .myt tbody tr {
      border-bottom: 1px solid #dddddd;
    }
    .myt tbody tr:nth-of-type(even) {
       background-color: #f3f3f3;
    }
    .myt tbody tr:last-of-type {
        /*border-bottom: 2px solid #009879;*/
    }
    .myt tbody tr .schg {
        color: ${CHANGE_POSITIVE_COLOR};
        font-weight: bold;
    }
    .myt tbody tr .wchg {
        color: ${CHANGE_POSITIVE_COLOR};
    }
    .myt tbody tr .ssur {
        color: ${SURPRISE_POSITIVE_COLOR};
        font-weight: bold;
    }
    .myt tbody tr .wsur {
        color: ${SURPRISE_POSITIVE_COLOR};
    }
    .myt tbody tr .sneg {
        color: ${CHANGE_NEGATIVE_COLOR};
        font-weight: bold;
    }
    .myt tbody tr .wneg {
        color: ${CHANGE_NEGATIVE_COLOR};
    }     
    .myt tbody tr td {
        text-align: right;
    }
    .myf {
       float: left;
       border: 1px solid #c9c9bb;
       border-collapse: collapse;
       margin: 15px 20px 25px 0px;
       padding-left: 5px;
       font-family: sans-serif;
       width: 900px;
       box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
    }
    .myf tr{
        border: 1px solid #c9c9bb;
    }
    .myf td{
        border: 1px solid #c9c9bb;
        padding: 10px 5px;
        width: 12%;
    }
    .fdata {
        text-align: left;
    }
    .fdata.ladr {
        color: ${LOW_ADR_COLOR};
        font-weight: bold;
    }
    .fdata.hshorts {
        color: ${HIGH_SHORT_INTEREST_COLOR};
        font-weight: bold;
    }
    .fdata.learnings {
        color: ${DAYS_BEFORE_EARNINGS_WARN_COLOR};
        font-weight: bold;
    }
    .ftitle {
        text-align: center;
        width: 25%;
    }
    #f_ticker {
        font-size: 1.2em;
    }
    .fv_chart {
        width: 900px;
        height: 340px;
    }
    .fv_description {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 900px;
        padding: 10px 0px;
    }
    .fv_description:hover {
            white-space: normal;
        }
    .body-table-rating-upgrade {
        color: #04C90A;
    }
    .body-table-rating-downgrade {
        color: #FF0000;
    }
    .news-link-container {
        display: flex;
    }
    .news-link-left {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        padding: 2px 0px;
    }
    .news-link-right {
        padding-left: 4px;
        display: flex;
        align-items: flex-end;
        white-space: nowrap;
    }
    .insider-buy-row-1, .insider-buy-row-2 {
        background-color: #b3f7a6;
    }
    .insider-sale-row-1, .insider-sale-row-2 {
        background-color: #fac68e;
    }
    .body-table-news-gain {
        color: #00FF00;
    }
    .body-table-news-loss {
        color: #FF0000;
    }
    ul[data-tabs] li {
        font-size: 0.7em;
    }
    .data-tab {
        margin-top: 20px;
    }
    .container {
        overflow: hidden;
        margin-top: 6px;
        margin-bottom: 50px;
    }
    .column {
        float: left;
        margin: 10px;
        padding-bottom: 100%;
        margin-bottom: -100%;
    }
    .loading_msg:after {
        content: '.';
        animation: dots 1s steps(1, end) infinite;
    }
    @keyframes dots {
        0%, 12.5% {
            opacity: 0;
        }
        25% {
            opacity: 1;
        }
        37.5% {
            text-shadow: .5em 0;
        }
        50% {
            text-shadow: .5em 0, 1em 0;
        }
        62.5% {
            text-shadow: .5em 0, 1em 0, 1.5em 0;
        }
        75% {
            text-shadow: .5em 0, 1em 0, 1.5em 0, 2em 0;
        }
        87.5%, 100%{
            text-shadow: .5em 0, 1em 0, 1.5em 0, 2em 0, 2.5em;
        }
    }   
    </style>`;
    hideContent();
    $('head').prepend(css);
}

//
//
// Display functions 
//
//
function displayContent() {
    $('#waiting').hide();
    $('body').prepend('<div id="h_earnings" class="container"><div class="column">' + yearlyToHtml(annualEst) + '</div>' + '<div class="column">' + epsDatesToHtml(epsDates) + '</div></div>');
}

function fundamentalsToHtml(data) {
    const html = `
        <style>
            /*! tabbyjs v12.0.3 | (c) 2019 Chris Ferdinandi | MIT License | http://github.com/cferdinandi/tabby */
            [role=tablist]{border-bottom:1px solid #d3d3d3;list-style:none;margin:0;padding:0}[role=tablist] *{box-sizing:border-box}@media (min-width:30em){[role=tablist] li{display:inline-block}}[role=tab]{border:1px solid transparent;border-top-color:#d3d3d3;display:block;padding:.5em 1em;text-decoration:none}@media (min-width:30em){[role=tab]{border-top-color:transparent;border-top-left-radius:.5em;border-top-right-radius:.5em;display:inline-block;margin-bottom:-1px}}[role=tab][aria-selected=true]{background-color:#d3d3d3}@media (min-width:30em){[role=tab][aria-selected=true]{background-color:transparent;border:1px solid #d3d3d3;border-bottom-color:#fff}}[role=tab]:hover:not([aria-selected=true]){background-color:#f7f7f7}@media (min-width:30em){[role=tab]:hover:not([aria-selected=true]){border:1px solid #d3d3d3}}[hidden]{display:none}
        </style>
        <script>
            /*! tabbyjs v12.0.3 | (c) 2019 Chris Ferdinandi | MIT License | http://github.com/cferdinandi/tabby */
            Element.prototype.matches||(Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector),Element.prototype.closest||(Element.prototype.matches||(Element.prototype.matches=Element.prototype.msMatchesSelector||Element.prototype.webkitMatchesSelector),Element.prototype.closest=function(e){var t=this;if(!document.documentElement.contains(this))return null;do{if(t.matches(e))return t;t=t.parentElement}while(null!==t);return null}),(function(e,t){"function"==typeof define&&define.amd?define([],(function(){return t(e)})):"object"==typeof exports?module.exports=t(e):e.Tabby=t(e)})("undefined"!=typeof global?global:"undefined"!=typeof window?window:this,(function(e){"use strict";var t={idPrefix:"tabby-toggle_",default:"[data-tabby-default]"},r=function(t){if(t&&"true"!=t.getAttribute("aria-selected")){var r=document.querySelector(t.hash);if(r){var o=(function(e){var t=e.closest('[role="tablist"]');if(!t)return{};var r=t.querySelector('[role="tab"][aria-selected="true"]');if(!r)return{};var o=document.querySelector(r.hash);return r.setAttribute("aria-selected","false"),r.setAttribute("tabindex","-1"),o?(o.setAttribute("hidden","hidden"),{previousTab:r,previousContent:o}):{previousTab:r}})(t);!(function(e,t){e.setAttribute("aria-selected","true"),e.setAttribute("tabindex","0"),t.removeAttribute("hidden"),e.focus()})(t,r),o.tab=t,o.content=r,(function(t,r){var o;"function"==typeof e.CustomEvent?o=new CustomEvent("tabby",{bubbles:!0,cancelable:!0,detail:r}):(o=document.createEvent("CustomEvent")).initCustomEvent("tabby",!0,!0,r),t.dispatchEvent(o)})(t,o)}}},o=function(e,t){var o=(function(e){var t=e.closest('[role="tablist"]'),r=t?t.querySelectorAll('[role="tab"]'):null;if(r)return{tabs:r,index:Array.prototype.indexOf.call(r,e)}})(e);if(o){var n,i=o.tabs.length-1;["ArrowUp","ArrowLeft","Up","Left"].indexOf(t)>-1?n=o.index<1?i:o.index-1:["ArrowDown","ArrowRight","Down","Right"].indexOf(t)>-1?n=o.index===i?0:o.index+1:"Home"===t?n=0:"End"===t&&(n=i),r(o.tabs[n])}};return function(n,i){var a,l,u={};u.destroy=function(){var e=l.querySelectorAll("a");Array.prototype.forEach.call(e,(function(e){var t=document.querySelector(e.hash);t&&(function(e,t,r){e.id.slice(0,r.idPrefix.length)===r.idPrefix&&(e.id=""),e.removeAttribute("role"),e.removeAttribute("aria-controls"),e.removeAttribute("aria-selected"),e.removeAttribute("tabindex"),e.closest("li").removeAttribute("role"),t.removeAttribute("role"),t.removeAttribute("aria-labelledby"),t.removeAttribute("hidden")})(e,t,a)})),l.removeAttribute("role"),document.documentElement.removeEventListener("click",c,!0),l.removeEventListener("keydown",s,!0),a=null,l=null},u.setup=function(){if(l=document.querySelector(n)){var e=l.querySelectorAll("a");l.setAttribute("role","tablist"),Array.prototype.forEach.call(e,(function(e){var t=document.querySelector(e.hash);t&&(function(e,t,r){e.id||(e.id=r.idPrefix+t.id),e.setAttribute("role","tab"),e.setAttribute("aria-controls",t.id),e.closest("li").setAttribute("role","presentation"),t.setAttribute("role","tabpanel"),t.setAttribute("aria-labelledby",e.id),e.matches(r.default)?e.setAttribute("aria-selected","true"):(e.setAttribute("aria-selected","false"),e.setAttribute("tabindex","-1"),t.setAttribute("hidden","hidden"))})(e,t,a)}))}},u.toggle=function(e){var t=e;"string"==typeof e&&(t=document.querySelector(n+' [role="tab"][href*="'+e+'"]')),r(t)};var c=function(e){var t=e.target.closest(n+' [role="tab"]');t&&(e.preventDefault(),r(t))},s=function(e){var t=document.activeElement;t.matches(n+' [role="tab"]')&&(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","Up","Down","Left","Right","Home","End"].indexOf(e.key)<0||o(t,e.key))};return a=(function(){var e={};return Array.prototype.forEach.call(arguments,(function(t){for(var r in t){if(!t.hasOwnProperty(r))return;e[r]=t[r]}})),e})(t,i||{}),u.setup(),(function(t){if(!(e.location.hash.length<1)){var o=document.querySelector(t+' [role="tab"][href*="'+e.location.hash+'"]');r(o)}})(n),document.documentElement.addEventListener("click",c,!0),l.addEventListener("keydown",s,!0),u}}));
            var f_tabs = new Tabby('[data-tabs]');
        </script>
        <ul data-tabs>
            <li><a data-tabby-default href="#f_fundamentals" onmouseover="f_tabs.toggle('#f_fundamentals')">Fundamentals</a></li>
            ${ chart_type != CHART_TYPE.NONE ?
                '<li><a href="#f_chart" onmouseover="f_tabs.toggle(\'#f_chart\')">Chart</a></li>'
                : ''
            }
            <li><a href="#f_ratings" onmouseover="f_tabs.toggle('#f_ratings')">Ratings</a></li>
            <li><a href="#f_news" onmouseover="f_tabs.toggle('#f_news')">News</a></li>
            <li><a href="#f_insiders" onmouseover="f_tabs.toggle('#f_insiders')">Insiders</a></li>
        </ul>

        <div class="data-tab" id="f_fundamentals">  
            <table class="myf"><tbody>
            <tr>
                <td class="ftitle" colspan="4"><a target="_blank" id="f_ticker" href="${data.tickerHref}">${data.ticker}</a><br/>
                ${data.site}<br/>
                <a target="_blank" href="${data.sectorHref}">${data.sector}</a> | <a target="_blank" href="${data.industryHref}">${data.industry}</a> | <a target="_blank" href="${data.countryHref}">${data.country}</a>
                </td>
            </tr>
            <tr>
                <td colspan="4"><div class="fv_description">${data.description}</div></td>
            </tr>
            <tr>
                <td>Mkt Cap</td><td class="fdata">${data.mktcap}</td>
                <td>ADR</td><td class="fdata${getHighlightClass4ADR(data.adr)}">${data.adr}</td>
            </tr>
            <tr>
                <td>Float</td><td class="fdata">${data.float}</td>
                <td>Next Earnings</td><td class="fdata${getHighlightClass4Earnings(data.earnings, data.daysToEarnings)}">${data.earnings}</td>
            </tr>
            <tr>
                <td>Short Float</td><td class="fdata${getHighlightClass4Shorts(data.shorts)}">${data.shorts}</td>
                <td>Inst Own</td><td class="fdata">${data.instown}</td>
            </tr>
            <tr>
                <td>Avg Volume</td><td class="fdata">${data.avgvolume}</td>
                <td>Rel Volume</td><td class="fdata">${data.relvolume}</td>
            </tr>
        </tbody></table>
        </div>
        <div class="data-tab" id="f_chart">
            ${ chart_type == CHART_TYPE.WEEKLY || chart_type == CHART_TYPE.BOTH ?
                isDefined(data.weeklyChart) ? ('<img class="fv_chart" src="data:image/png;base64, ' + data.weeklyChart + '" alt="' + data.ticker + ' chart"/>') 
                                    : 'No data available'
                : '' }
            ${ chart_type == CHART_TYPE.DAILY || chart_type == CHART_TYPE.BOTH ?    
                isDefined(data.dailyChart) ? ('<br/><img class="fv_chart" src="data:image/png;base64, ' + data.dailyChart + '" alt="' + data.ticker + ' chart"/>') 
                                    : 'No data available'
               : '' }
        </div>
        <div class="data-tab" id="f_ratings">
            ${isDefined(data.ratings) ? data.ratings : 'No data available'}
        </div>
        <div class="data-tab" id="f_news">
            ${isDefined(data.news) ? data.news : 'No data available'}
        </div>
        <div class="data-tab" id="f_insiders">
            ${isDefined(data.insiders) ? data.insiders : 'No data available'}
        </div>`;
    return html;
}

function epsDatesToHtml(epsDates) {
    let html = '<table class="myt">';
    html += '<thead><tr><td>Quarter</td><td>EPS</td><td>%Change</td>';
    if (show_earnings_surprise) {
        html += '<td>%Surprise</td>';
    }
    html += '<td>Revenue(Mil)</td><td>%Change</td>';
    if (show_earnings_surprise) {
        html += '<td>%Surprise</td>';
    }
    html += '</tr></thead><tbody>';
    
    if (epsDates.length == 0) {
        html += '<tr><td colspan="${show_earnings_surprise ? 7 : 5}">No data found</td></tr>';
        html += '</tbody></table>';
        return html;
    }

    epsDates.forEach(function(item, index) {
        // skip all but the last 8 qtrs if option is enabled
        if (limit_num_qtr == true && index < epsDates.length - 8) { return; }
        
        let epsPerf = '-';
        if (isDefined(item.eps.perf)) {
            if (ms_style_output == true && item.eps.negativeCompQtr) {
                epsPerf = 'N/A';
            } 
            else {
                if (ms_style_output == true && item.eps.perf >= 1000) {
                    epsPerf = '999';   
                }
                else { epsPerf = item.eps.perf; }
                if (item.eps.perf > 0) { epsPerf = '+' + epsPerf; }
                if (ms_style_output == true && item.eps.negativeTurnaround) { epsPerf = '#'+epsPerf; }
                if (ms_style_output == true) { epsPerf = epsPerf + '%'; }
            }
        }
        let surpriseEpsPerf = '-';
        if (isDefined(item.eps.surprisePerf)) {
            surpriseEpsPerf = item.eps.surprisePerf;
            if (item.eps.surprisePerf > 0) { surpriseEpsPerf = '+' + surpriseEpsPerf; }
            if (ms_style_output == true) { surpriseEpsPerf = surpriseEpsPerf + '%'; }
        }
        let revPerf = '-';
        if (isDefined(item.rev.perf)) {
            if (ms_style_output == true && item.rev.perf >= 1000) {
                    revPerf = '999';   
            }
            else { revPerf = item.rev.perf; }
            if (item.rev.perf > 0) { revPerf = '+' + revPerf; }
            if (ms_style_output == true) { revPerf = revPerf + '%'; }
        }
        let surpriseRevPerf = '-';
        if (isDefined(item.rev.surprisePerf)) {
            surpriseRevPerf = item.rev.surprisePerf;
            if (item.rev.surprisePerf > 0) { surpriseRevPerf = '+' + surpriseRevPerf; }
            if (ms_style_output == true) { surpriseRevPerf = surpriseRevPerf + '%'; }
        }
        html += '<tr><td>' + getDisplayQuarter(item.name) + '</td>';
        html += '<td>' + item.eps.eps + '</td>';
        html += '<td class="' + getHighlightClass4Change(item.eps.perf, epsPerf) + '">' + epsPerf + '</td>';
        if (show_earnings_surprise) {
            html += '<td class="' + getHighlightClass4Surprise(item.eps.surprisePerf, surpriseEpsPerf) + '">' + surpriseEpsPerf + '</td>';
        }
        html += '<td>' + numberWithCommas(item.rev.rev) + '</td>';
        html += '<td class="' + getHighlightClass4Change(item.rev.perf, revPerf) + '">' + revPerf  + '</td>';
        if (show_earnings_surprise) {
            html += '<td class="' + getHighlightClass4Surprise(item.rev.surprisePerf, surpriseRevPerf) + '">' + surpriseRevPerf + '</td>';
        }
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

function yearlyToHtml(annualEst) {
    let html = '<table class="myt">';
    html += '<thead><tr><td>Year</td><td>EPS</td><td>%Change</td><td>Revenue(Mil)</td><td>%Change</td></tr></thead><tbody>';
    
    if (annualEst.length == 0) {
        html += '<tr><td colspan="5">No data found</td></tr>';
        html += '</tbody></table>';
        return html;
    }

    annualEst.forEach(function(item, index){
        let yearlyEps = '-';
        if (typeof item.eps !== 'undefined') {
            yearlyEps = item.eps.toString();
        }
        let yearlyRev = '-';
        if (typeof item.rev !== 'undefined') {
            yearlyRev = item.rev.toString();
        }
        let epsPerf = '-';
        if (isDefined(item.epsPerf)) {
            epsPerf = item.epsPerf > 0 ? ('+' + item.epsPerf) : item.epsPerf;
            if (ms_style_output == true) { epsPerf = epsPerf + '%'; }
        }
        let revPerf = '-';
        if (isDefined(item.revPerf)) {
            revPerf = item.revPerf > 0 ? ('+' + item.revPerf) : item.revPerf;
            if (ms_style_output == true) { revPerf = revPerf + '%'; }
        }

        html += '<tr><td>' + item.name + '</td>';
        html += '<td>' + yearlyEps + '</td>';
        html += '<td class="' + getHighlightClass4Change(item.epsPerf, epsPerf) + '">' + epsPerf + '</td>';
        html += '<td>' + numberWithCommas(yearlyRev) + '</td>';
        html += '<td class="' + getHighlightClass4Change(item.revPerf, revPerf) + '">' + revPerf  + '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
}

/*
   Returns appropriate highlight class for EPS and revenue change values
   >= 30 : bold positive 
   >0 && < 30 : positive
   <0 && >-20 : negative
   < -20 : bold negative
*/
function getHighlightClass4Change(num, str) {
    let hclass = '';
    if (str === 'N/A') { return hclass; }
    if (! isDefined(num)) { return hclass; }

    if (num >= 30) {
        hclass = ' schg';
    } else if (num > 0 && num < 30) {
        hclass = ' wchg';
    } else if (num < 0 && num > -20) {
        hclass = ' wneg';
    }
    else if (num <= -20) {
        hclass = ' sneg';
    }
    
    return hclass;
}

function getHighlightClass4Surprise(num, str) {
    let hclass = '';
    if (str === 'N/A') { return hclass; }
    if (! isDefined(num)) { return hclass; }

    if (num >= 30) {
        hclass = ' ssur';
    } else if (num > 0 && num < 30) {
        hclass = ' wsur';
    } else if (num < 0 && num > -20) {
        hclass = ' wneg';
    }
    else if (num <= -20) {
        hclass = ' sneg';
    }
    
    return hclass;
}

function getHighlightClass4ADR(adrStr) {
    let hclass = '';
    if (! isDefined(adrStr) || adrStr.length == 0) { return hclass; }
    let adr = parseFloat(adrStr.replace(/%$/, ""));
    if (adr < LOW_ADR_THRESHOLD) {
        hclass = ' ladr';
    } 
    return hclass;
}

function getHighlightClass4Shorts(shortsStr) {
    let hclass = '';
    if (! isDefined(shortsStr) || shortsStr.length == 0 || shortsStr == '-') { return hclass; }
    let shorts = parseFloat(shortsStr.replace(/%$/, ""));
    if (shorts > HIGH_SHORT_INTEREST_THRESHOLD) {
        hclass = ' hshorts';
    } 
    return hclass;
}

function getHighlightClass4Earnings(earningsStr, daysToEarnings) {
    let hclass = '';
    if (! isDefined(earningsStr) || earningsStr.length == 0 || earningsStr == '-') { return hclass; }
    
    if (isDefined(daysToEarnings) && daysToEarnings <= DAYS_BEFORE_EARNINGS_WARN_THRESHOLD) {
        hclass = ' learnings';
    } 
    return hclass;
}

//
// extraction/preparation
//
function hideContent() {
    if (default_ds == 1) {
        // SA
        $('#main-nav-wrapper-row').hide();
        $('#tab-content-header').hide();
        $('#sp-center-menu').hide();
        $('.symbol_title').hide();
        $('#estimates').hide();
        $('#cresscap').hide();
        $('.panel-body').hide();
        $('#breaking-news').hide();
        $('.col-xs-3').hide();
    }
    else if (default_ds == 2) {
        //ZA
        $('header.primary-nav--content').hide();
        $('.header-logos').hide();
        $('.user-menu_list').hide();
        $('.clearfix top-header-section').hide();
        $('#quote_ribbon_v2').hide();
        $('#quote_sidebar_toggle+nav.left_subnav').hide();
        $('.quote_body').hide();
        $('.reserach_reports_cta_v2').hide();
        $('.quote_body_full nav').hide();
        $('#banner a').hide()
        $('iframe').hide();
        $('footer').hide();
        $('.disclosure-fixed-slab').hide();
    }
}

function extractAndProcess() {
    if (default_ds == 1) {
        // add quarters
        $('.panel-title.earning-title').each(function() {
            let quarter = new SAQarter(
                                $(this).find('.title-period').text(),
                                $(this).find('.eps').text().trim().replace(/(\r\n|\n|\r)/gm, ""), 
                                $(this).find('.revenue').contents().text().trim().replace(/(\r\n|\n|\r)/gm, ""));

            if (isQuarterValid(quarter)) {
                epsDates.unshift(quarter);
            }
        });

        // add annual eps estimates
        $('#annual-eps-esimates-tbl tbody .row-content').each(function() {
            let year = new Year(
                parseInt(getAnnualEstimateName($(this).children().eq(0).text().trim())),
                "*" + getAnnualEstimateName($(this).children().eq(0).text().trim()),
                $(this).children().eq(1).text().trim());
            year.qtrs4Year = 4;           
            annualEst.push(year);
        });

        // add annual revenue estimates to existing annual eps estimates or create new one if not found
        $('#annual-rev-esimates-tbl tbody .row-content').each(function() {
            const yearInt = parseInt(getAnnualEstimateName($(this).children().eq(0).text().trim()));
            const foundYear = annualEst.find(q => q.year == yearInt);
            if (foundYear) {
                foundYear.rev = revenueStringToFloat($(this).children().eq(1).text().trim());
            }
            else {
                let year = new Year(
                    yearInt,
                    "*" + getAnnualEstimateName($(this).children().eq(0).text().trim()),
                    undefined,
                    revenueStringToFloat($(this).children().eq(1).text().trim()));

                annualEst.push(year);
            }
        })
    }
    else if (default_ds == 2) {
        let data = $('#earnings_announcements_tabs').next().html().trim();
        data = data.substr(data.indexOf('{'));
        data = data.substr(0, data.lastIndexOf('}')+1);
        let dataObj = JSON.parse(data);
        dataObj.earnings_announcements_earnings_table.forEach(function(item, index){
            let quarter = new ZAQarter(
                item[1],
                item[3],
                item[5], 
                dataObj.earnings_announcements_sales_table);
   
            if (isQuarterValid(quarter)) {
                epsDates.unshift(quarter);
            }
        });
    }

    calculateQuarterlyPerf(epsDates);   
    fillAnnual(epsDates, annualEst);
    calculateAnnualPerf(annualEst);
}

// Calculations
// calculates quarterly performance (%Chg) based on comparative quarter
function calculateQuarterlyPerf(qrts) {
   qrts.map(function(qtr, index) {
        let compQuarter = qrts.find(q => q.name == getComparativeQuarterName(qtr));
        if (isDefined(compQuarter)) {
            if (compQuarter.eps.eps != 0) {
               qtr.eps.negativeCompQtr = false; 
               qtr.eps.negativeTurnaround = false;
               qtr.eps.perf = calculatePercentChange(qtr.eps.eps, compQuarter.eps.eps);
               if (qtr.eps.eps < 0 && compQuarter.eps.eps) {
                    qtr.eps.negativeCompQtr = true;
               }
               else if (compQuarter.eps.eps < 0) {
                    qtr.eps.negativeTurnaround = true;
               }
           }
           if (isAbleToCalculateQtrRevChange(qtr, compQuarter)) {
                qtr.rev.perf = calculatePercentChange(qtr.rev.rev, compQuarter.rev.rev);
           }
       }       
   });
}

// Fill eps/revenue for previous years using existing quaterly data
// getLatestYear to get year for latest quarter available (e.g. 2020)
// attempt to find all quarters for given year
// when found 0 quarters, exit
function fillAnnual(epsDates, annualEst) {
    if (epsDates.length == 0) { return; }
    let year = getLatestQtrYear(epsDates);
    while (true) {
        let yearItem = new Year(year, year, 0, 0);
        let qtrs4Year = 0;

        // find all quarters for given year
        epsDates.forEach(function(qtr) {
            if (qtr.name.indexOf(year.toString()) > -1) {
                yearItem.eps += qtr.eps.eps;
                yearItem.rev += qtr.rev.rev;
                ++qtrs4Year;
            }
        })

        if (qtrs4Year == 0) {
            break;
        }

        if (qtrs4Year == 4) {
            yearItem.eps = +yearItem.eps.toFixed(2);
            yearItem.rev = +yearItem.rev.toFixed(1);
            yearItem.qtrs4Year = qtrs4Year;
            annualEst.unshift(yearItem);
        }
        --year;
    }
}

// Calculates annual performance (%Chg) for each year by comparing with previous year
function calculateAnnualPerf(years) {
   years.map(function(item, index) {
        const previousYear = years.find(q => q.year == (item.year - 1));
        // check if previous year available. present year and previous have 4 qtrs.
        if (isDefined(previousYear) && item.qtrs4Year == 4 && previousYear.qtrs4Year == 4) {
            item.epsPerf = calculatePercentChange(item.eps, previousYear.eps);
            item.revPerf = calculatePercentChange(item.rev, previousYear.rev);
       }
   });
}

// Helpers
function getComparativeQuarterName(qtr) {
    return qtr.month + ' ' + (qtr.year - 1);
}

function getDisplayQuarter(qtr) {
    return qtr.substr(0,3) + '-' + qtr.substr(6);
}

function revenueStringToFloat(revStr) {
    revStr = revStr.trim();
    if (revStr.endsWith('M')) {
        return parseFloat(parseFloat(revStr).toFixed(1));
    } else if (revStr.endsWith('K')) {
        return parseFloat((parseFloat(revStr) / 1000).toFixed(2));
    } else if (revStr.endsWith('B')) {
        return Math.round(parseFloat(revStr) * 1000);
    }
    else {
        return parseFloat((parseFloat(revStr) / 1000).toFixed(2));
    }
}

function getAnnualEstimateName(str) {
    let start = str.indexOf(' ');
    if (start > -1) {
        return str.substr(start+1);
    }
    return start;
}

function getLatestQtrYear(epsDates) {
    if (epsDates.length == 0) { return undefined; }
    let lastQtrName = epsDates[epsDates.length-1].name;
    let year = parseInt(lastQtrName.substr(lastQtrName.indexOf(' ')+1));
    return year;
}

function calculatePercentChange(current, previous) {
    if (!isDefined(current) || !isDefined(previous) || previous == 0) { return undefined; }
    return Math.round(100*((current - previous) / Math.abs(previous)));
}

function isQuarterValid(qtr) {
    return isDefined(qtr.name) && qtr.name.length > 0 && isDefined(qtr.eps.eps) && !isNaN(qtr.eps.eps);
}

function isAbleToCalculateQtrRevChange(qtr, compQuarter) {
    return qtr.rev.rev != 0 && !isDefined(qtr.rev.perf) && compQuarter.rev.rev != 0;
}

function numberWithCommas(x) {
    if (!isDefined(x) || x == null) { return '-'; }
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function isDefined(smth) {
    return typeof smth !== 'undefined';
}

// Classes
class Quarter {
    constructor() {}
}

class SAQarter extends Quarter {
    constructor (nameStr, epsStr, revStr) {
        super();
        const nameAttr = SAQarter.parseQtrName(nameStr);
        super.name = nameAttr.name;
        super.month = nameAttr.month;
        super.year = parseInt(nameAttr.year);
        super.eps = SAQarter.parseQtrEps(epsStr);
        super.rev = SAQarter.parseQtrRev(revStr);
    }

    // extracts qtr name in the form mmm yyyy
    static parseQtrName(str) {
        let qtr = {}
        let start = str.indexOf('(')+1;
        qtr.name = str.substr(start, str.indexOf(')')-start);
        qtr.month = qtr.name.substr(0,3);
        qtr.year = qtr.name.substr(4);
        return qtr;
    }

    /*
       Parse quaterly EPS string. String can be in the form:

       Q2 2020 (Jun 2020) EPS of -$0.31 beat by $0.05/missed by $0.05
       Q2 2020 (Jun 2020) GAAP EPS of $0.01

    */
    static parseQtrEps(str) {
        let eps = {};
        let dPos = str.indexOf('$');
        if (dPos > -1) {
            let sign = '';
            if (str.substr(dPos-1,1) == '-') {
                sign = '-';
            }
            let sPos = str.indexOf(' ', dPos);
            if (sPos == -1) {
                eps.eps = parseFloat((sign + str.substr(dPos+1)).trim());
            }
            else {
                eps.eps = parseFloat((sign + str.substr(dPos+1, sPos-dPos)).trim());
                eps.surprisePerf = SAQarter.calculateSurpriseEPSPerf(str.substr(sPos+1).trim(), eps.eps);
            }
        }
        return eps;
    }

    static calculateSurpriseEPSPerf(str, eps) {
        if (!isDefined(str)) { return undefined; }
        let dPos = str.indexOf('$');
        if (dPos < 0) { return undefined; }

        let sign = '';
        if (str.substr(dPos-1,1) == '-') {
            sign = '-';
        }
        let surprise = parseFloat((sign + str.substr(dPos+1)).trim());
        let projectedEps = eps - surprise;
        let surprisePerf = calculatePercentChange(eps, projectedEps);
        return surprisePerf;
    }

    /*
        Parse quaterly revenue string. String can be in the form:

        Revenue of $112.33M (54.30% YoY) beat by $8.47M
        Revenue of $112.33M beat by $8.47M
        Revenue of $112.33M
    */
    static parseQtrRev(str) {
        let rev = {};
        rev.rev = 0;
        let revStr = '';

        let pos = str.indexOf('(');
        if (pos == -1) {
            let sPos = str.indexOf(' ', 13);
            if (sPos == -1) {
                revStr = str.substr(13).trim();
            } else {
                revStr = str.substr(13, sPos-13).trim();
                rev.surprisePerf = str.substr(sPos+1).trim();
            }
        }
        else {
            revStr = str.substr(12+1, pos-12-1).trim();
            rev.perf = Math.round(parseFloat(str.substr(pos+1, str.indexOf('%')-1-pos)));
            rev.surprisePerf = str.substr(str.indexOf(')')+1).trim();
        }
        rev.rev = SAQarter.revenueStringToFloat(revStr);
        rev.surprisePerf = SAQarter.calculateSurpriseRevPerf(rev.surprisePerf, rev.rev);
        return rev;
    }

    static calculateSurpriseRevPerf(str, rev) {
        if (!isDefined(str)) { return undefined; }
        let dPos = str.indexOf('$');
        if (dPos < 0) { return undefined; }

        let sign = '';
        if (str.substr(dPos-1,1) == '-') {
            sign = '-';
        }
        let surprise = SAQarter.revenueStringToFloat((sign + str.substr(dPos+1)).trim());
        let projectedRev = rev - surprise;
        let surpriseRev = calculatePercentChange(rev, projectedRev);
        return surpriseRev;
    }

    static revenueStringToFloat(revStr) {
        revStr = revStr.trim();
        if (revStr.endsWith('M')) {
            return parseFloat(parseFloat(revStr).toFixed(1));
        } else if (revStr.endsWith('K')) {
            return parseFloat((parseFloat(revStr) / 1000).toFixed(2));
        } else if (revStr.endsWith('B')) {
            return Math.round(parseFloat(revStr) * 1000);
        }
        else {
            return parseFloat((parseFloat(revStr) / 1000).toFixed(2));
        }
    }
}

class ZAQarter extends Quarter {
    constructor (nameStr, epsStr, epsSurpriseStr, revData) {
        super();
        const nameAttr = ZAQarter.parseQtrName(nameStr);
        super.name = nameAttr.name;
        super.month = nameAttr.month;
        super.year = parseInt(nameAttr.year);
        super.eps = ZAQarter.parseQtrEps(epsStr, epsSurpriseStr);
        super.rev = ZAQarter.parseQtrRev(nameStr, revData);
    }

    static parseQtrName(str) {
        let qtr = {};
        let parts = str.split('/');
        let month = parseInt(parts[0]);
        let year = parseInt(parts[1]);
        qtr.name = MONTH_MAP[month] + ' ' + year;
        qtr.month = MONTH_MAP[month];
        qtr.year = year;
        return qtr;
    }

    static parseQtrEps(epsStr, epsSurpriseStr) {
        let eps = {};
        eps.eps =  parseFloat(epsStr.replace(/\$/, ''));
        epsSurpriseStr = epsSurpriseStr.substr(epsSurpriseStr.indexOf('>') + 2).slice(0, -7);
        eps.surprisePerf = Math.round(parseFloat(epsSurpriseStr));
        return eps;
    }

    static parseQtrRev(period, revData) {
        let rev = {};
        rev.rev = 0;
        // find corresponding period in revData
        revData.forEach(function(item) {
            if (item[1] == period) {
                rev.rev = parseFloat(item[3].replace(/[\$\,]/g, ''));
                // round to 1 decimal
                rev.rev = Math.round(rev.rev * 10) / 10;
                
                let revSurprise = item[5].substr(item[5].indexOf('>') + 2).slice(0, -7);
                rev.surprisePerf = Math.round(parseFloat(revSurprise));
            }
        });
        return rev;
    }
}

class Year {
    constructor (year, name, eps, rev) {
        this.year = year;
        this.name = name;
        this.eps = eps;
        this.rev = rev;
    }
}
