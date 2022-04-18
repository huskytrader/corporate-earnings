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

const HIGH_INST_CHANGE_THRESHOLD = 10;
const HIGH_INST_CHANGE_COLOR = '#00FF00';

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

const SA_REGEX = /symbol\/([a-zA-Z]+)\/earnings/;
const ZA_REGEX = /stock\/research\/([a-zA-Z]+)\/earnings-calendar/;

const FETCH_URL = 'aHR0cHM6Ly9maW52aXouY29tL3F1b3RlLmFzaHg/dD0='
const FETCH_URL_PREFIX = 'aHR0cHM6Ly9maW52aXouY29tLw==';
const IMAGE_URL = 'aHR0cHM6Ly9jaGFydHMyLmZpbnZpei5jb20vY2hhcnQuYXNoeD90PQ==';
const CHROME_PREFIX_REGEX = /chrome-extension:\/\/\w+\//;
const FIREFOX_PREFIX_REGEX = /moz-extension:\/\/((\w{4,12}-?)){5}\//;


// init options to default values
var enable_copy_on_click = false;
// chart type: 1=desc first sentence, 2=full desc
var data_to_copy = 1;
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

chrome.storage.local.get(['enable_copy_on_click', 
                          'data_to_copy',
                          'chart_type', 
                          'fetch_fundamental_data', 
                          'show_earnings_surprise', 
                          'ms_style_output', 
                          'limit_num_qtr', 
                          'default_ds'], 
                          function(options) {

    if (isDefined(options.enable_copy_on_click)) {enable_copy_on_click = options.enable_copy_on_click;}
    if (isDefined(options.data_to_copy)) {data_to_copy = options.data_to_copy;}                        
    if (isDefined(options.fetch_fundamental_data)) { fetch_fundamental_data = options.fetch_fundamental_data; }
    if (isDefined(options.chart_type)) { chart_type = options.chart_type; }
    if (isDefined(options.show_earnings_surprise)) { show_earnings_surprise = options.show_earnings_surprise; }
    if (isDefined(options.default_ds)) { default_ds = options.default_ds; } 
    if (isDefined(options.ms_style_output)) { ms_style_output = options.ms_style_output; }
    if (isDefined(options.limit_num_qtr)) { limit_num_qtr = options.limit_num_qtr; }


    if (fetch_fundamental_data == true) {
        chrome.runtime.sendMessage({chart_type: chart_type}, (response) => {
            if (!response.error) {     
                response = parseFundamentalsData(response.raw, response);
                fundamentals.push(response)
                waitForEl("#h_earnings", displayFundamentals, 30); 
            }
        });
    }

    insertCSS();
    displayWaiting();

    if (default_ds == 1) {
        // SA
        //const noData = document.querySelector('#history .no-data') == null;
        //if(noData) {
        //    hide(document.querySelector('#waiting'));
        //    bodyPrepend('<div class="mymsg">No earnings data available for this symbol.</div>');
        //    return;
        //}   
        waitForEarningsData(displayEarnings, 30);
    }
    else if (default_ds == 2) {
        displayEarnings(true);
        // ZA
        //extractAndProcess();
        //displayContent();
    }
 });

//
// end of main
//

/**
 * Wait for the specified element to appear in the DOM. When the element appears,
 * provide it to the callback. Will wait additional 250ms where callback.
 *
 * @param selector 
 * @param callback function that takes selected element (null if timeout)
 * @param maxtries number of times to try (return null after maxtries, false to disable, if 0 will still try once)
 * @param interval ms wait between each try
 */
function waitForEarningsData(callback, maxtries = false, interval = 100) {
  const poller = setInterval(() => {
    const isContains = contains('span', 'Earnings history')
    const retry = maxtries === false || maxtries-- > 0;
    if (retry && !isContains) return; // will try again
    clearInterval(poller);
    setTimeout(function() {
            callback(isContains);
    }, 1000);
  }, interval);
}

function waitForEl(el, callback, maxtries = false, interval = 100) {
  const poller = setInterval(() => {
    const isContains = document.querySelector(el)
    const retry = maxtries === false || maxtries-- > 0;
    if (retry && !isContains) return; // will try again
    clearInterval(poller);
    setTimeout(function() {
            callback(isContains);
    }, 1000);
  }, interval);
}

function displayFundamentals(el) {
    if (fundamentals.length > 0) {        
       let html = '<div class="f_container"><div colspan="2" class="column">' + fundamentalsToHtml(fundamentals[0], 
                                                                                        enable_copy_on_click, 
                                                                                        data_to_copy == 1) + 
       '</div></div>';  

        if (document.querySelector('#h_earnings'))
            document.querySelector('#h_earnings').insertAdjacentHTML('beforeend', html);

    } 
}

function displayEarnings(isContains) {
    if(!isContains) {
        hide(document.querySelector('#waiting'));
        bodyPrepend('<div class="mymsg">No earnings data available for this symbol.</div>');
        return;
    }
    extractAndProcess();
    hideClientContent()
    displayContent();
}

function displayWaiting() {
    bodyPrepend('<div class="container" id="waiting"><p class="loading_msg">Loading</p></div>');
}

function insertCSS() {
    const css = `<style>
    .mymsg, #waiting {
       font-size: 1em;
       font-style: italic;
       z-index: 9999;
       color: #39ff14;
       background-color: #000000;
       padding: 20px;
       font-weight: bold;
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
    .fdata.hinstchange {
        color: ${HIGH_INST_CHANGE_COLOR};
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
    #h_inner {
        margin: 0 auto;
    }   
    .h_container {
        overflow: hidden;
        margin-top: 6px;
        margin-bottom: 50px;
        width:100%;
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
    headPrepend(css);
}

//
//
// Display functions 
//
//
function displayContent() {
    hide(document.querySelector('#waiting'));
    bodyPrepend('<div id="h_earnings" class="e_container">' + 
        '<div class="e_inner"><div class="column">' + yearlyToHtml(annualEst) + '</div>' + 
        '<div class="column">' + epsDatesToHtml(epsDates) + '</div></div></div>');
}

function fundamentalsToHtml(data, enable_copy_on_click, short_description) {
    const html = `
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
                <td>Days to cover</td><td class="fdata">${data.daystocover}</td>
                <td>Inst Trans (3mo)</td><td class="fdata${getHighlightClass4InstChange(data.instchange)}">${strToNum(data.instchange) > 0 ? "+"+data.instchange : data.instchange}</td>
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
        </div>
        <script>
            var descriptionInterval = undefined;
            function copyOnDocumentFocus() {
                if (${enable_copy_on_click} && document.hasFocus()) {
                    clearInterval(descriptionInterval);
                    copyDescription(${short_description});
                }
            } 
            function copyDescription(short_description) {
                let desc = document.querySelector('.fv_description').textContent
                const match = /\\.\ [A-Z]/.exec(desc);
                if (short_description && match) {
                    desc = desc.substr(0, match.index);
                }
                toClipboard(desc);                
            }           
            function toClipboard(text) {
                navigator.clipboard.writeText(text).then(function(){}, function(err) {
                    console.log("Failed to copy description to clipboard", err);
                });
            }

            descriptionInterval = false && setInterval(copyOnDocumentFocus, 300);
        </script>
        `;
    return html;
}

function epsDatesToHtml(epsDates) {
    let html = '<table class="myt">';
    html += '<thead><tr>';
    if (default_ds == 2) html += '<td>Date</td>';
    html += '<td>Quarter</td><td>EPS</td><td>%Change</td>';
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
        html += '<tr>';
        if (default_ds == 2) html += '<td>' + item.date + '</td>';
        html += '<td>' + getDisplayQuarter(item.name) + '</td>';
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

function getHighlightClass4InstChange(instChangeStr) {
    let hclass = '';
    if (! isDefined(instChangeStr) || instChangeStr.length == 0 || instChangeStr == '-') { return hclass; }
    let instChange = parseFloat(instChangeStr.replace(/%$/, ""));
    if (instChange > HIGH_INST_CHANGE_THRESHOLD) {
        hclass = ' hinstchange';
    } 
    return hclass;
}

function strToNum(str) {
    if (!isDefined(str)) return 0;
    str = str.replace(/[^\d.-]/g, '');
    if (str == '') return 0;
    return parseFloat(str);
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
function hideClientContent() {
    if (default_ds == 1) {
        // SA
        hide(document.querySelector('#root'));
        hide(document.querySelector('nav[aria-label="Main"] div'))
        hide(document.querySelector('#main-nav-wrapper-row'));
        hide(document.querySelector('#tab-content-header'));
        hide(document.querySelector('#sp-center-menu'));
        hide(document.querySelector('.symbol_title'));
        hide(document.querySelector('#estimates'));
        hide(document.querySelector('#cresscap'));
        hide(document.querySelector('.panel-body'));
        hide(document.querySelector('#breaking-news'));
        hide(document.querySelector('.col-xs-3'));
    }
    else if (default_ds == 2) {
        //ZA
        hide(document.querySelector('header'));
        hide(document.querySelector('.primary-nav--content'));
        hide(document.querySelector('#primary'));
        hide(document.querySelector('.header-logos'));
        hide(document.querySelector('.user-menu_list'));
        hide(document.querySelector('.clearfix top-header-section'));
        hide(document.querySelector('#quote_ribbon_v2'));
        hide(document.querySelector('#quote_sidebar_toggle+nav.left_subnav'));
        hide(document.querySelector('.quote_body'));
        hide(document.querySelector('.reserach_reports_cta_v2'));
        hide(document.querySelector('.quote_body_full nav'));
        hide(document.querySelector('#banner a'));
        hide(document.querySelector('iframe'));
        hide(document.querySelector('footer'));
        hide(document.querySelector('div.disclosure-fixed-slab'));
    }
}

function collectChildText(elem) {
    let rows = [];
    Array.from(elem.children).forEach((child) => {
        let cells = [];
        Array.from(child.children).forEach((subChild) => {
            cells.push(subChild.textContent);
        });
        if (cells.length > 0 && cells[0] != '') {
            rows.push(cells);
        }
    });   
    return rows;
}

function extractAndProcess() {
    if (default_ds == 1) {
        // add quarters
        let dataBlockCount = 1;
        const blocks = document.querySelectorAll('[data-test-id="table-body"]')
        blocks.forEach(block => {
            let rows = [];
            switch(dataBlockCount++) {
                case 1:
                    break;
                case 2: 
                    // eps estimates
                    rows = collectChildText(block);
                    for (const row of rows) {
                        if (!isDefined(row[0]) || row[0] == '') continue;
                        let year = new Year(
                            getAnnualEstimateYear(row[0]),
                            "*" + getAnnualEstimateYear(row[0]),
                            row[1]);
                        year.qtrs4Year = 4;           
                        annualEst.push(year);
                    }
                    break;
                case 3: 
                    // revenue estimates
                    rows = collectChildText(block);
                    for (const row of rows) {
                        if (!isDefined(row[0]) || row[0] == '') continue;
                        let yearInt = getAnnualEstimateYear(row[0]);
                        const foundYear = annualEst.find(q => q.year == yearInt);
                        if (foundYear) {
                            foundYear.rev = revenueStringToFloat(row[1]);
                        }
                        else {
                            let year = new Year(
                                yearInt,
                                "*" + year,
                                undefined,
                                revenueStringToFloat(row[1]));
                            annualEst.push(year);
                        }
                    }
                    break;
                case 4:
                    // earnings data
                    rows = collectChildText(block);
                    for (const row of rows) {
                        if (!isDefined(row[0]) || row[0] == '' || !row[0].includes('FQ')) continue;
                        let q = new SAQarter(row);
                        if (isQuarterValid(q)) {
                            epsDates.unshift(q);
                        }
                    };
                    break;
            }
        });  
    }
    else if (default_ds == 2) {
        let json = document.querySelector('#earnings_announcements_tabs').nextElementSibling.innerHTML.trim()
        json = json.substr(json.indexOf('{'));
        json = json.substr(0, json.lastIndexOf('}')+1);
        let dataObj = JSON.parse(json);
        dataObj.earnings_announcements_earnings_table.forEach(item => {
            let quarter = new ZAQarter(
                item[0],
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

function getAnnualEstimateYear(str) {
    let start = str.indexOf(' ');
    if (start > -1) {
        return parseInt(str.substr(start+1));
    }
    return parseInt(start);
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
    return qtr.rev.rev != 0 && compQuarter.rev.rev != 0;
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
    constructor (cells) {
        super();
        const nameAttr = SAQarter.parseQtrName(cells[0]);
        super.name = nameAttr.name;
        super.month = nameAttr.month;
        super.year = parseInt(nameAttr.year);
        super.eps = SAQarter.parseQtrEps(cells[1], cells[2]);
        super.rev = SAQarter.parseQtrRev(cells[3], cells[5]);
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
    static parseQtrEps(epsStr, surpriseStr) {
        let eps = {};
        eps.eps = parseFloat(epsStr);
        if (isDefined(surpriseStr) && surpriseStr != '-') {
            eps.surprisePerf = SAQarter.calculateSurprisePercent(parseFloat(surpriseStr), eps.eps);
        }
        return eps;
    }

 
    /*
        Parse quaterly revenue string. String can be in the form:

        Revenue of $112.33M (54.30% YoY) beat by $8.47M
        Revenue of $112.33M beat by $8.47M
        Revenue of $112.33M
    */
    static parseQtrRev(revStr, surpriseStr) {
        let rev = {};
        rev.rev = 0;

        rev.rev = SAQarter.revenueStringToFloat(revStr);
        if (isDefined(surpriseStr) && surpriseStr != '-') {
            rev.surprisePerf = SAQarter.calculateSurprisePercent(SAQarter.revenueStringToFloat(surpriseStr), rev.rev);
        }

        return rev;
    }

    static calculateSurprisePercent(surprise, measure) {
        if (!isDefined(surprise)) { return undefined; }
        let projected = measure - surprise;
        let surprisePercent = calculatePercentChange(measure, projected);
        return surprisePercent;
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
    constructor (dateStr, nameStr, epsStr, epsSurpriseStr, revData) {
        super();
        const nameAttr = ZAQarter.parseQtrName(nameStr);
        super.date = dateStr;
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


function parseFundamentalsData(raw, results) {
    const parser = new DOMParser();
    const dom = parser.parseFromString(raw, 'text/html');

    const tickerNode = dom.querySelector('.fullview-ticker');
    results.ticker = tickerNode.textContent;
    results.tickerHref = fixExternalLink(tickerNode.getAttribute('href'));
    results.exchange = tickerNode.nextElementSibling.textContent;

    const secondRowNode = tickerNode.parentElement.parentElement.nextElementSibling;
    const siteNode = secondRowNode.querySelector('a');
    results.site = siteNode.outerHTML;
    results.companyName = siteNode.textContent;

    const thirdRowNode = secondRowNode.nextElementSibling;
    const thirdRowLinks = thirdRowNode.querySelectorAll('a');
    results.sector = thirdRowLinks[0].textContent;
    results.sectorHref = fixExternalLink(thirdRowLinks[0].getAttribute('href'));
    results.industry = thirdRowLinks[1].textContent;
    results.industryHref = fixExternalLink(thirdRowLinks[1].getAttribute('href'));
    results.country = thirdRowLinks[2].textContent;
    results.countryHref = fixExternalLink(thirdRowLinks[2].getAttribute('href'));

    const tds = Array.from(dom.querySelectorAll('td'));
    results.shorts = getSiblingText(tds, 'Short Float');
    results.daystocover = getSiblingText(tds, 'Short Ratio');
    results.float = getSiblingText(tds, 'Shs Float');
    processEarnings(getSiblingText(tds, 'Earnings'), results);
    results.mktcap = getSiblingText(tds, 'Market Cap');
    results.adr = getSiblingText(tds, 'Volatility').split(' ')[1];
    results.instown = getSiblingText(tds, 'Inst Own');
    results.instchange = getSiblingText(tds, 'Inst Trans');
    results.relvolume = getSiblingText(tds, 'Rel Volume');
    results.avgvolume = getSiblingText(tds, 'Avg Volume');
    
    results.description = dom.querySelector('.fullview-profile').textContent;
    if (isDefined(results.companyName)) {
        const regex = new RegExp('^'+results.companyName+',? (together with its subsidiaries, )?(through its subsidiaries, )?');
        results.description = results.description.replace(regex, '');
    }

    results.ratings = transformRatingsData(dom.querySelector('.fullview-ratings-outer').outerHTML);

    results.news = dom.querySelector('.fullview-news-outer').outerHTML;
    
    const bds = dom.querySelectorAll('.body-table');
    results.insiders = bds[bds.length-1].outerHTML;

    return results;
}

const transformRatingsData = (html) => {
    html = html.replace(/<\/?b>/g, '')
    const parser = new DOMParser()
    const dom = parser.parseFromString(html, 'text/html')
    const ratingsNodes = dom.querySelectorAll('table table')   
    let result = ''
    result = '<table id="ht-ratings">\n'
    for (const ratingsNode of ratingsNodes) {
        let ratingsRow = ratingsNode.querySelector('tr')
        let rowClass = ratingsRow.getAttribute('class')
        let highlightClass = ''
        switch(rowClass.trim()) {
            case 'body-table-rating-downgrade':
                highlightClass = 'ht-ratings-downgrade'
                break
            case 'body-table-rating-upgrade':
                highlightClass = 'ht-ratings-upgrade'
                break
        }
        result += '<tr'
        if (highlightClass != '') result += ' class="' + highlightClass + '"'
        result += '>\n'    
        let cells = ratingsNode.querySelectorAll('td')
        for (let cellNode of cells) {
            result += '<td>' + cellNode.innerHTML + '</td>\n'
        }
        result += '</tr>\n'
    }
    result += '</table>\n'
    return result  
}

// Chrome prepends chrome-extension://adcd/
// Firefox prepends mozilla-extension://uuid/
function fixExternalLink(str) {
    let res = str.replace(CHROME_PREFIX_REGEX, decode(FETCH_URL_PREFIX));
    res = res.replace(FIREFOX_PREFIX_REGEX, decode(FETCH_URL_PREFIX));
    if (! res.startsWith('http')) res = decode(FETCH_URL_PREFIX) + res;
    return res;
}

// remove onmouse* events from insiders
// prepend URL_PREFIX
function processInsiders(str) {
    if (!isDefined(str)) { return undefined; }
    let removed = str.replace(/ on\w+="[^"]*"/g, '');
    removed = removed.replace(/insidertrading\.ashx/g, decode(FETCH_URL_PREFIX) + "insidertrading.ashx");
    return removed;
}

function processEarnings(str, results) {
    results.earnings = str;
    const today = new Date();
    today.setHours(0,0,0,0);

    const parts = str.split(' ')
    if (parts.length < 2) { return undefined; }
    const earningsMonth = REVERSE_MONTH_MAP[parts[0]];
    const earningsDate = new Date(today.getFullYear(), earningsMonth, parts[1]);
    earningsDate.setHours(0,0,0,0);

    if (earningsDate.getTime() < today.getTime()) {
        results.earnings = '-';
        return;
    }

    // if earnings month is 9,10,11 and today's months is 0,1,2 set earnings date to previous year
    if ((earningsMonth == 9 || earningsMonth == 10 || earningsMonth == 11) &&
        (today.getMonth() == 0 || today.getMonth == 1 || today.getMonth == 2)) {
        earningsDate.setFullYear(today.getFullYear() - 1);
    }

    results.earningsDate = earningsDate;
    if (today.getFullYear() != earningsDate.getFullYear()) {
        results.daysToEarnings = 185;
    }
    else {
        results.daysToEarnings = getWorkingDays(today, earningsDate);
    }
}

function getWorkingDays(startDate, endDate) {
    var numWorkDays = 0;
    var currentDate = new Date(startDate);
    while (currentDate < endDate) {
        // Skips Sunday and Saturday
        if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
            numWorkDays++;
        }
        currentDate = currentDate.addDays(1);
    }
    return numWorkDays;
}

Date.prototype.addDays = function (days) {
    let date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

function arrayBufferToBase64(buffer) {
    if (!buffer || buffer.length == 0) { return undefined; }
    let binary = '';
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function decode(str) {
    if (!isDefined(str)) { return undefined; }
    return decodeURIComponent(escape(atob(str)));
}

function getSymbol(url) {
    // extract current symbol from url
    let res = SA_REGEX.exec(url);
    if (res != null) {
        return res[1];
    } else {
        res = ZA_REGEX.exec(url);
        if (res != null) {
            return res[1];
        }
    }
    return undefined;
}

function getSiblingText(arr, txt) {
   return arr[arr.findIndex(el => el.textContent === txt) + 1].textContent; 
}

const bodyPrepend = (html) => {
    document.body.insertAdjacentHTML('afterbegin', html);
}

const headPrepend = (html) => {
    document.head.insertAdjacentHTML('afterbegin', html);
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

// toggle the element visibility
const toggle = (element) => {
    if (element != null && element.style != null) {
        if(element.style.display === "none"){
            element.style.display = "block";
        }else{
            element.style.display = "none";
        }
    }
    //elem.classList.toggle('hidden');
}

const contains = (selector, text) => {
  const elements = document.querySelectorAll(selector)
  return [].filter.call(elements, (element) => {
    return element.textContent.includes(text)
  }).length > 0
}
