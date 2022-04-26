// constants
const CHANGE_POSITIVE_COLOR = '#0000FF';
const CHANGE_NEGATIVE_COLOR = '#FF0000';
const SURPRISE_POSITIVE_COLOR = '#04C90A';

const LOW_ADR_THRESHOLD = 4.0;
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

var fetch_fundamental_data = true;
var show_earnings_only = false;
var chart_type = CHART_TYPE.NONE;
var show_earnings_surprise = false;
var default_ds = 1;
var ms_style_output = true;
var limit_num_qtr = true;

var quarterlyData = [];
var annualData = [];
var fundamentals = {};

chrome.storage.local.get(['chart_type', 
                          'show_earnings_only', 
                          'show_earnings_surprise', 
                          'ms_style_output', 
                          'limit_num_qtr', 
                          'default_ds'], 
                          function(options) {
                   
    if (isDefined(options.show_earnings_only)) { 
        show_earnings_only = options.show_earnings_only; 
        fetch_fundamental_data = !options.show_earnings_only; 
    }
    if (isDefined(options.chart_type)) { chart_type = options.chart_type; }
    if (isDefined(options.show_earnings_surprise)) { show_earnings_surprise = options.show_earnings_surprise; }
    if (isDefined(options.default_ds)) { default_ds = options.default_ds; } 
    if (isDefined(options.ms_style_output)) { ms_style_output = options.ms_style_output; }
    if (isDefined(options.limit_num_qtr)) { limit_num_qtr = options.limit_num_qtr; }

    insertCSS();
    displayWaiting();

    if (fetch_fundamental_data) {
        chrome.runtime.sendMessage({chart_type: chart_type}, (response) => {
            if (!response.error) {     
                extractFundamentalData(response, fundamentals);
                if (document.getElementById('ht-root-container') == null) {
                    insertHTML();
                    hideNativeContent();
                }
                renderFundamentalData();
                if (document.getElementById('ht-msg-noearnings') != null) {
                    hide(document.getElementById('ht-msg-noearnings'));
                    hide(document.getElementById('ht-waiting-earnings'));
                    
                }
                //waitForEl("#ht-company", renderFundamentalData, 15); 
            }
        });
    }

    if (default_ds == 1) {
        // SA
        waitForEarningsData(displayEarnings, 30);
    }
    else if (default_ds == 2) {
        // ZA
        displayEarnings(true);
    }
 });

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
    //callback(isContains);
    setTimeout(function() {
            callback(isContains);
    }, 1500);
  }, interval);
}

function waitForEl(el, callback, maxtries = false, interval = 200) {
  const poller = setInterval(() => {
    const isContains = document.querySelector(el)
    const retry = maxtries === false || maxtries-- > 0;
    if (retry && !isContains) return; // will try again
    clearInterval(poller);
    callback(isContains);
  }, interval);
}

function renderFundamentalData(found = true) {
    if (!found) return;
    if (!isDefined(fundamentals.ticker)) {
        document.getElementById('ht-company').innerHTML = '<span class="ht-warningmsg">No data received</span>';
        return
    }      

    const companyHtml = `<a id="ht-company-link" href="${fundamentals.companySite}" target="_blank"><b>${fundamentals.companyName}</b></a> <span id="ht-ticker">(${fundamentals.ticker})</span>
                    ${fundamentals.sector} | ${fundamentals.industry} | ${fundamentals.country}
                    `;
    document.getElementById('ht-company').innerHTML = companyHtml;
    const priceVolume = `\$${fundamentals.price}</br><span id="ht-volume">Vol: ${fundamentals.volume}</span>`;
    document.getElementById('ht-pricevol').innerHTML = priceVolume;
    document.getElementById('ht-description').innerHTML = fundamentals.description;
    document.getElementById('ht-fundamentals-mktcap').innerHTML = fundamentals.mktcap;
    document.getElementById('ht-fundamentals-adr').innerHTML = fundamentals.adr;
    const isHighlightAdr = isAdrLow(fundamentals.adr);
    if (isHighlightAdr) {
        document.getElementById('ht-fundamentals-adr').classList.add('ladr');
    }
    document.getElementById('ht-fundamentals-float').innerHTML = fundamentals.float;
    document.getElementById('ht-fundamentals-earnings').innerHTML = fundamentals.earnings;
    const isHighlightEarnings = isEarningsDateClose(fundamentals.earnings, fundamentals.daysToEarnings);
    if (isHighlightEarnings) {
        document.getElementById('ht-fundamentals-earnings').classList.add('learnings');
    }
    document.getElementById('ht-fundamentals-shortfloat').innerHTML = fundamentals.shorts;
    const isHighlightShorts = isShortInterestHigh(fundamentals.shorts);
    if (isHighlightShorts) {
        document.getElementById('ht-fundamentals-shortfloat').classList.add('hshorts');
    }
    document.getElementById('ht-fundamentals-instown').innerHTML = fundamentals.instown;
    document.getElementById('ht-fundamentals-daystocover').innerHTML = fundamentals.daystocover;
    document.getElementById('ht-fundamentals-instrans3mo').innerHTML = fundamentals.instchange;
    const isHighlightInstChange = isHighInstitutionalOwnershipChange(fundamentals.instchange);
    if (isHighlightInstChange) {
        document.getElementById('ht-fundamentals-instrans3mo').classList.add('hinstchange');
    }
    document.getElementById('ht-fundamentals-avgvol').innerHTML = fundamentals.avgvolume;
    document.getElementById('ht-fundamentals-relvol').innerHTML = fundamentals.relvolume;

    document.getElementById('ht-ratings-cell').innerHTML = fundamentals.ratingsHtml;
    document.getElementById('ht-news-cell').innerHTML = fundamentals.newsHtml;
    document.getElementById('ht-insiders-cell').innerHTML = fundamentals.insidersHtml;

    if (chart_type == CHART_TYPE.WEEKLY || chart_type == CHART_TYPE.BOTH) {
        let weekly = '';
        if (isDefined(fundamentals.weeklyChart)) 
            weekly = '<img src="data:image/png;base64, ' + fundamentals.weeklyChart + '" alt="' + fundamentals.ticker + ' chart"/>';
        else 
            weekly = 'No weekly chart available';

        document.getElementById('ht-chart-weekly').innerHTML = weekly;
    }  
    if (chart_type == CHART_TYPE.DAILY || chart_type == CHART_TYPE.BOTH) {
        let daily = '';
        if (isDefined(fundamentals.dailyChart)) 
            daily = '<img src="data:image/png;base64, ' + fundamentals.dailyChart + '" alt="' + fundamentals.ticker + ' chart"/>';
        else 
            daily = 'No daily chart available';

        document.getElementById('ht-chart-daily').innerHTML = daily;
    }  
}

function displayEarnings(isContains) {
    extractAndProcessEarningsData();
    if (document.getElementById('ht-root-container') == null) {
        if (quarterlyData.length == 0 && annualData.length == 0) {
            hide(document.getElementById('ht-waiting'));
            bodyPrepend('<div id="ht-msg-noearnings">No earnings data available for this symbol.</div>');
            return;    
        }
        else {
            insertHTML();
            pushEarningsData();
            hideNativeContent();
        }
    }
    else {
        pushEarningsData();
    }
}

function pushEarningsData() {
    hide(document.getElementById('ht-waiting-earnings'));
    document.getElementById('ht-earnings-yearly').innerHTML = annualToHtml(annualData);
    document.getElementById('ht-earnings-quarterly').innerHTML = quarterlyToHtml(quarterlyData);
}

function displayWaiting() {
    bodyPrepend('<div id="ht-waiting"><p class="ht-loadingmsg">Waiting for data</p></div>');
}

function insertCSS() {
    const showChart = fetch_fundamental_data && chart_type != CHART_TYPE.NONE;
    const css = `<style>
    #ht-msg-noearnings, #ht-waiting {
       font-size: large;
       font-style: italic;
       z-index: 9999;
       color: #39ff14;
       background-color: #000000;
       padding: 40px;
       font-weight: bold;
    }
    #ht-warningmsg {
        color: #ff0000;
        font-style: italic;
    }
    #ht-waiting-fundamentals {
        font-style: italic; 
        font-weight: bold; 
        color: #39ff14; 
    }
    #ht-waiting-earnings {
        font-style: italic; 
        font-weight: bold; 
        color: #39ff14; 
        font-size: medium;
    }
    #ht-root-container {
        width: 100%;
        margin: 0;
        border: 1px solid #c9c9bb;
        border-collapse: collapse;
    }
    #ht-root-container table {
        width: auto;
        display:table;
        margin: 0 0;
    }
    #ht-root-container td {
        font-weight: 400;
        line-height: 1.5;
        font-family: sans-serif;
    }
    #ht-fundamentals-container {
       border: 1px solid #c9c9bb;
       border-collapse: collapse;
       margin: 0px 0px 5px 0px;
       box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
    }
    #ht-fundamentals-container tr{
        border: 1px solid #c9c9bb;
    }
    #ht-fundamentals-container td{
        border: 1px solid #c9c9bb;
        padding: 2px 5px;   
        font-size: small;
        text-align: left;
    }
    #ht-fundamentals-container.ht-fdata td {
        text-align: left;
        font-size: small;
    }    
    #ht-fundamentals-earnings.learnings {
        color: ${DAYS_BEFORE_EARNINGS_WARN_COLOR};
        font-weight: bold;
    }
    #ht-fundamentals-adr.ladr {
        color: ${LOW_ADR_COLOR};
        font-weight: bold;
    }
    #ht-fundamentals-shortfloat.hshorts {
        color: ${HIGH_SHORT_INTEREST_COLOR};
        font-weight: bold;
    }
    #ht-fundamentals-instown.hinstchange {
        color: ${HIGH_INST_CHANGE_COLOR};
        font-weight: bold;
    }
    #ht-company a{  
        text-align: left;
        font-size: medium;
    }
    a#ht-company-link, a#ht-company-link:hover, a#ht-company-link:link, a#ht-company-link:visited {
        color: #1e6dc0;
        text-decoration: none;
    }
    a#ht-company-link:hover {
        background-color: #1e6dc0;
        color: #fff;
    }
    span#ht-ticker {
       font-size: medium; 
    }
    td#ht-pricevol {
        font-size: medium;
    }
    span#ht-volume {
        font-size: small;
    }
    #ht-description {
        max-width: 700px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding: 7px 0px;
        font-size: medium;
    }
    #ht-description:hover {
        white-space: normal;
    }
    #ht-ec-container {
        width: 100%;
        border-collapse: collapse;
        border: 1px solid #c9c9bb; 
    }
    td#ht-earnings-container {
        padding:  10px 5px 10px 0;
        border: 1px solid #c9c9bb;
        ${!showChart ? ('width: 100% !important;') : ''}
    }
    #ht-earnings-yearly {
        padding-bottom: 10px;
        padding-right: 20px;
        ${!showChart ? ('float: left;') : ''}
    }
    #ht-earnings-quarterly {
        ${!showChart ? ('float: left;') : ''}
    }
    #ht-chart-container {
        width: 100%;
        text-align: left;
    }
    #ht-rni-container {
        width: 100%;
        border-collapse: collapse;
    }
    #ht-rni-container td {
        font-size: small;
    }
    #ht-ratings-cell {
        width:  30%;
        vertical-align: top;
        border: 1px solid #c9c9bb;
    }
    #ht-news-cell {
        width:  50%;
        vertical-align: top;
        border: 1px solid #c9c9bb;
    }
    #ht-insiders-cell {
        border: 1px solid #c9c9bb;
        vertical-align: top;
    } 
    #ht-ratings-table {
        width: 100%;
        height: 100%;         
    }
    #ht-ratings-table td {
        vertical-align: top;
        border: 0;
        border-top: 0;
        border: bottom: 0;
        text-align: left;
        padding: 0 2px;
    }
    .ht-ratings-date {
        white-space: nowrap;
    }
    .ht-ratings-price {
        white-space: nowrap;
    }
    .ht-ratings-upgrade {
         color: #04C90A;
    }
    .ht-ratings-downgrade {
        color: #FF0000;
    }
    #ht-news-table {
        width:  100%;
        height: 100%;
    }
    #ht-news-table td {
        border: 0;
        border-top: 0;
        border: bottom: 0;
    }
    .ht-news-date-cell {
        white-space: nowrap;
        text-align:  right;
        padding-right: 4px;
    }
    .ht-news-link-cell {
        text-align: left;
    }
    a.ht-news-link, a.ht-news-link:hover, a.ht-news-link:link, a.ht-news-link:visited {
        color: #1e6dc0;
        text-decoration: none;
    }
    a.ht-news-link:hover {
        background-color: #1e6dc0;
        color: #fff;
    }
    .ht-news-source {
        color: #aa6dc0;
        font-size: x-small;
        padding-left: 3px;
    }
    #ht-insiders-table td {
        border: 0;
        border-top: 0;
        border: bottom: 0;
        text-align: left;
        padding: 0 2px;
    }
    .ht-insiders-date {
        white-space: nowrap;
    }
    .ht-insiders-buy {
        color: #03fc66;
    }
    .ht-insiders-sell {
        color: #f76b2f;
    }
    a.ht-insiders-link, a.ht-insiders-link:hover, a.ht-insiders-link:link, a.ht-insiders-link:visited {
        color: #1e6dc0;
        text-decoration: none;
    }
    a.ht-insiders-link:hover {
        background-color: #1e6dc0;
        color: #fff;
    }
    .ht-earnings-table {
       border-collapse: collapse;
       font-family: sans-serif;
       min-width: 30%;
       box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
    }
    .ht-earnings-table thead tr td {
       background-color: #333333;
       color: #ffffff;
       font-size: small;
       text-align: left;
       padding: 4px ${show_earnings_surprise ? 4 : 6}px;
    }
    .ht-earnings-table tbody tr td {
        text-align: right;
        padding: 4px;
        font-size: small;
    }    
    .ht-earnings-table tbody tr td:first-child {
        white-space: nowrap;
    } 
    .ht-earnings-table tbody tr {
      border-bottom: 1px solid #dddddd;
    }
    .ht-earnings-table tbody tr:nth-of-type(even) {
       background-color: #f3f3f3;
    }
    .ht-earnings-table tbody tr .ht-strong-pos-change{
        color: ${CHANGE_POSITIVE_COLOR};
        font-weight: bold;
    }
    .ht-earnings-table tbody tr .ht-weak-pos-change {
        color: ${CHANGE_POSITIVE_COLOR};
    }
    .ht-earnings-table tbody tr .ht-strong-neg-change {
        color: ${CHANGE_NEGATIVE_COLOR};
        font-weight: bold;
    }
    .ht-earnings-table tbody tr .ht-weak-neg-change {
        color: ${CHANGE_NEGATIVE_COLOR};
    } 
    .ht-earnings-table tbody tr .ht-strong-pos-surprise {
        color: ${SURPRISE_POSITIVE_COLOR};
        font-weight: bold;
    }
    .ht-earnings-table tbody tr .ht-weak-pos-surprise {
        color: ${SURPRISE_POSITIVE_COLOR};
    }     
    .ht-loadingmsg:after {
        content: '.';
        animation: ht-dots 1s steps(1, end) infinite;
    }
    @keyframes ht-dots {
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
function insertHTML() {
    hide(document.querySelector('#ht-waiting'));
    let html = '';
    const showEarningsOnly = !fetch_fundamental_data;
    if (showEarningsOnly) {
        html = `
        <div id="ht-root-container" style="width: 100%; border: 0;">
            <div id="ht-earnings-yearly">
            </div>
            <div id="ht-earnings-quarterly">
            </div>
        </div>
        `;
    }
    else {
        const showChart = fetch_fundamental_data && chart_type != CHART_TYPE.NONE;
        html = `
        <div id="ht-root-container">
            <table id="ht-fundamentals-container">
                <tr>
                    <td colspan="3" id="ht-company" colspan="4"><span id="ht-waiting-fundamentals" class="ht-loadingmsg">Waiting for data</span></td>
                    <td id="ht-pricevol"></td>
                </tr>
                <tr>
                    <td colspan="4"><div id="ht-description"></div></td>
                </tr>
                <tr class="ht-fdata">
                    <td title="Market capitalization">Mkt Cap</td><td title="Market capitalization" id="ht-fundamentals-mktcap"></td>
                    <td title="Monthly volatility">ADR</td><td title="Monthly volatility" id="ht-fundamentals-adr"></td>
                </tr>
                <tr class="ht-fdata">
                    <td title="Shares float">Shares Float</td><td title="Shares float" id="ht-fundamentals-float"></td>
                    <td title="Next earnings date">Next Earnings</td><td title="Next earnings date" id=ht-fundamentals-earnings></td>
                </tr>
                <tr class="ht-fdata">
                    <td title="Short interest shares">Short Float</td><td title="Short interest shares" id="ht-fundamentals-shortfloat"></td>
                    <td title="Institutional ownership">Inst Own</td><td title="Institutional ownership" id="ht-fundamentals-instown"></td>
                </tr>
                <tr class="ht-fdata">
                    <td title="Short interest ratio">Days to cover</td><td title="Short interest ratio" id="ht-fundamentals-daystocover"></td>
                    <td title="Institutional transactions (3 month change in institutional ownership)">Inst Trans</td><td title="Institutional transactions (3 month change in institutional ownership)" id="ht-fundamentals-instrans3mo"></td>
                </tr>
                <tr class="ht-fdata">
                    <td title="Average volume (3 months)">Avg Volume</td><td title="Average volume (3 months)" id="ht-fundamentals-avgvol"></td>
                    <td title="Relative volume">Rel Volume</td><td title="Relative volume" id="ht-fundamentals-relvol"></td>
                </tr> 
            </table>            
            <table id="ht-ec-container">
                <tr>
                    <td id="ht-earnings-container">
                        <div id="ht-earnings-yearly"><span id="ht-waiting-earnings" class="ht-loadingmsg">Waiting for data</span></div>
                        <div id="ht-earnings-quarterly"></div>
                    </td>
                    ${showChart ? '<td id="ht-chart-container"><div id="ht-chart-weekly"></div><div id="ht-chart-daily"></div></td>' : ''}              
                </tr>
            </table>
            <table id="ht-rni-container">
                <tr>
                    <td id="ht-ratings-cell"></td>
                    <td id="ht-news-cell"></td>   
                    <td id="ht-insiders-cell"></td>
                </tr>    
            </table>
        </div>
        `;
    }
    bodyPrepend(html);
}

function quarterlyToHtml(quarterlyData) {
    let html = '<table class="ht-earnings-table">';
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
    
    if (quarterlyData.length == 0) {
        html += '<tr><td colspan="${show_earnings_surprise ? 7 : 5}">No data available</td></tr>';
        html += '</tbody></table>';
        return html;
    }

    quarterlyData.forEach(function(item, index) {
        // skip all but the last 8 qtrs if option is enabled
        if (limit_num_qtr == true && index < quarterlyData.length - 8) { return; }
        
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
        html += '<td style="white-space: nowrap;">' + getDisplayQuarter(item.name) + '</td>';
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

function annualToHtml(annualData) {
    let html = '<table class="ht-earnings-table">';
    html += '<thead><tr><td>Year</td><td>EPS</td><td>%Change</td><td>Revenue(Mil)</td><td>%Change</td></tr></thead><tbody>';
    
    if (annualData.length == 0) {
        html += '<tr><td colspan="5">No data available</td></tr>';
        html += '</tbody></table>';
        return html;
    }

    annualData.forEach(function(item, index){
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

        if (item.name.toString().startsWith('*')) {
            html += '<tr><td title="Estimated">' + item.name + '</td>';
            html += '<td title="Estimated">' + yearlyEps + '</td>';
            html += '<td title="Estimated" class="' + getHighlightClass4Change(item.epsPerf, epsPerf) + '">' + epsPerf + '</td>';
            html += '<td title="Estimated">' + numberWithCommas(yearlyRev) + '</td>';
            html += '<td title="Estimated" class="' + getHighlightClass4Change(item.revPerf, revPerf) + '">' + revPerf  + '</td></tr>';
        }
        else {
            html += '<tr><td>' + item.name + '</td>';
            html += '<td>' + yearlyEps + '</td>';
            html += '<td class="' + getHighlightClass4Change(item.epsPerf, epsPerf) + '">' + epsPerf + '</td>';
            html += '<td>' + numberWithCommas(yearlyRev) + '</td>';
            html += '<td class="' + getHighlightClass4Change(item.revPerf, revPerf) + '">' + revPerf  + '</td></tr>';
        }
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
        hclass = ' ht-strong-pos-change';
    } else if (num > 0 && num < 30) {
        hclass = ' ht-weak-pos-change';
    } else if (num < 0 && num > -20) {
        hclass = ' ht-weak-neg-change';
    }
    else if (num <= -20) {
        hclass = ' ht-strong-neg-change';
    }
    return hclass;
}

function getHighlightClass4Surprise(num, str) {
    let hclass = '';
    if (str === 'N/A') { return hclass; }
    if (! isDefined(num)) { return hclass; }

    if (num >= 30) {
        hclass = ' ht-strong-pos-surprise';
    } else if (num > 0 && num < 30) {
        hclass = ' ht-weak-pos-surprise';
    } else if (num < 0 && num > -20) {
        hclass = ' ht-weak-neg-change';
    }
    else if (num <= -20) {
        hclass = ' ht-strong-neg-change';
    }
    return hclass;
}

function isAdrLow(adrStr) {
    if (! isDefined(adrStr) || adrStr.length == 0) return false;
    let adr = parseFloat(adrStr.replace(/%$/, ""));
    if (adr < LOW_ADR_THRESHOLD) {
        return true;
    } 
    return false;
}

function isShortInterestHigh(shortsStr) {
    if (! isDefined(shortsStr) || shortsStr.length == 0 || shortsStr == '-') return false;
    let shorts = parseFloat(shortsStr.replace(/%$/, ""));
    if (shorts > HIGH_SHORT_INTEREST_THRESHOLD) {
        return true;
    } 
    return false;
}

function isHighInstitutionalOwnershipChange(instChangeStr) {
    if (! isDefined(instChangeStr) || instChangeStr.length == 0 || instChangeStr == '-') return false;
    let instChange = parseFloat(instChangeStr.replace(/%$/, ""));
    if (instChange > HIGH_INST_CHANGE_THRESHOLD) {
        return true;
    } 
    return false;
}

function strToNum(str) {
    if (!isDefined(str)) return 0;
    str = str.replace(/[^\d.-]/g, '');
    if (str == '') return 0;
    return parseFloat(str);
}

function isEarningsDateClose(earningsStr, daysToEarnings) {
    if (! isDefined(earningsStr) || earningsStr.length == 0 || earningsStr == '-')  return false;
    if (isDefined(daysToEarnings) && daysToEarnings <= DAYS_BEFORE_EARNINGS_WARN_THRESHOLD) {
        return true;
    } 
    return false;
}

//
// extraction/preparation
//
function hideNativeContent() {
    let elem = document.querySelector('#ht-waiting').nextElementSibling;
    while (elem) {
        hide(elem);
        elem = elem.nextElementSibling;
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

// attemps to extract earnings quarterly and annual data from html
// if successful, will parse and calculate Change%
function extractAndProcessEarningsData() {
    if (default_ds == 1) {
        // add quarters
        let dataBlockCount = 1;
        const monthYearRegex = /^[A-Za-z]{3} \d{4}/;
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
                        if (!isDefined(row[0]) || row[0] == '' || row[0].match(monthYearRegex) == null) continue;
                        let year = new Year(
                            getAnnualEstimateYear(row[0]),
                            "*" + getAnnualEstimateYear(row[0]),
                            row[1]);
                        year.qtrs4Year = 4;           
                        annualData.push(year);
                    }
                    break;
                case 3: 
                    // revenue estimates
                    rows = collectChildText(block);
                    for (const row of rows) {
                        if (!isDefined(row[0]) || row[0] == '' || row[0].match(monthYearRegex) == null) continue;
                        let yearInt = getAnnualEstimateYear(row[0]);
                        const foundYear = annualData.find(q => q.year == yearInt);
                        if (foundYear) {
                            foundYear.rev = revenueStringToFloat(row[1]);
                        }
                        else {
                            let year = new Year(
                                yearInt,
                                "*" + yearInt,
                                undefined,
                                revenueStringToFloat(row[1]));
                            annualData.push(year);
                        }
                    }
                    break;
                case 4:
                    // earnings data
                    rows = collectChildText(block);
                    for (const row of rows) {
                        if (!isDefined(row[0]) || !isDefined(row[1]) || !isDefined(row[3]) || row[0] == '' || !row[0].includes('FQ')) continue;
                        let q = new SAQarter(row);
                        if (isQuarterValid(q)) {
                            quarterlyData.unshift(q);
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
                quarterlyData.unshift(quarter);
            }
        });
    }

    calculateQuarterlyPerf(quarterlyData);   
    fillAnnual(quarterlyData, annualData);
    calculateAnnualPerf(annualData);
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
function fillAnnual(quarterlyData, annualData) {
    if (quarterlyData.length == 0) { return; }
    let year = getLatestQtrYear(quarterlyData);
    while (true) {
        let yearItem = new Year(year, year, 0, 0);
        let qtrs4Year = 0;

        // find all quarters for given year
        quarterlyData.forEach(function(qtr) {
            if (qtr.name.indexOf(year.toString()) > -1) {
                if (isDefined(qtr.eps.eps))
                    yearItem.eps += qtr.eps.eps;
                if (isDefined(qtr.rev.rev))
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
            annualData.unshift(yearItem);
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

function getLatestQtrYear(quarterlyData) {
    if (quarterlyData.length == 0) { return undefined; }
    let lastQtrName = quarterlyData[quarterlyData.length-1].name;
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
    return isDefined(qtr.rev.rev) && qtr.rev.rev != 0 && 
           isDefined(compQuarter.rev.rev) && compQuarter.rev.rev != 0;
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
        if (epsStr == '' || epsStr == '-') return undefined;
        eps.eps = parseFloat(epsStr);
        if (isDefined(surpriseStr) && surpriseStr != '-' && isDefined(eps.eps)) {
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
        if (isDefined(surpriseStr) && surpriseStr != '-' && isDefined(rev.rev)) {
            rev.surprisePerf = SAQarter.calculateSurprisePercent(SAQarter.revenueStringToFloat(surpriseStr), rev.rev);
        }

        return rev;
    }

    static calculateSurprisePercent(surprise, measure) {
        if (!isDefined(surprise) || !isDefined(measure)) { return undefined; }
        let projected = measure - surprise;
        let surprisePercent = calculatePercentChange(measure, projected);
        return surprisePercent;
    }

    static revenueStringToFloat(revStr) {
        revStr = revStr.trim();
        if (revStr == '' || revStr == '-') return undefined;
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

        if (isDefined(epsSurpriseStr) && epsSurpriseStr.indexOf('>') > -1) {
            epsSurpriseStr = epsSurpriseStr.substr(epsSurpriseStr.indexOf('>') + 2).slice(0, -7);
            eps.surprisePerf = Math.round(parseFloat(epsSurpriseStr));
        }
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
                
                if (isDefined(item[5]) && item[5].indexOf('>') > -1) {
                    let revSurprise = item[5].substr(item[5].indexOf('>') + 2).slice(0, -7);
                    rev.surprisePerf = Math.round(parseFloat(revSurprise));
                }
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

function extractFundamentalData(response, results) {
    results.dailyChart = response.dailyChart;
    results.weeklyChart = response.weeklyChart;

    const parser = new DOMParser();
    const dom = parser.parseFromString(response.raw, 'text/html');

    const tickerNode = dom.querySelector('.fullview-ticker');
    results.ticker = tickerNode.textContent;
    results.tickerHref = fixExternalLink(tickerNode.getAttribute('href'));
    results.exchange = tickerNode.nextElementSibling.textContent;

    const secondRowNode = tickerNode.parentElement.parentElement.nextElementSibling;
    const siteNode = secondRowNode.querySelector('a');
    results.companySite = siteNode.getAttribute('href');
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
    results.price = getSiblingText(tds, 'Price');
    results.volume = getSiblingText(tds, 'Volume');
    
    results.description = dom.querySelector('.fullview-profile').textContent;
    if (isDefined(results.companyName)) {
        const regex = new RegExp('^'+results.companyName+',? (together with its subsidiaries, )?(through its subsidiaries, )?');
        results.description = results.description.replace(regex, '');
    }

    if (dom.querySelector('.fullview-ratings-outer') != null) {
        results.ratingsJson = extractRatings(dom.querySelector('.fullview-ratings-outer').outerHTML);
        results.ratingsHtml = renderRatings(results.ratingsJson);
    }
    else {
        results.ratingsHtml = 'No ratings available';
    }

    if (dom.querySelector('.fullview-news-outer') != null) {
        results.newsJson = extractNews(dom.querySelector('.fullview-news-outer').outerHTML);
        results.newsHtml = renderNews(results.newsJson);
    }
    else {
        results.newsHtml = 'No news available';
    }
    
    const bds = dom.querySelectorAll('.body-table');
    if (Array.from(bds).length > 0) {
        results.insidersJson = extractInsiders(bds[bds.length-1].outerHTML);
        results.insidersHtml = (results.insidersJson.length > 0) ? renderInsiders(results.insidersJson) :
                                'No insider transactions available'; 
    }
    return results;
}

const transformRatingsData = (html) => {
    html = html.replace(/<\/?b>/g, '')
    const parser = new DOMParser()
    const dom = parser.parseFromString(html, 'text/html')
    const ratingsNodes = dom.querySelectorAll('table table')   
    let result = ''
    result = '<table id="ht-ratings-table">\n'
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

    if (earningsDate.getTime() + (24*60*60*1000) < today.getTime()) {
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

// prepends html to body
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
}

const contains = (selector, text) => {
  const elements = document.querySelectorAll(selector)
  return [].filter.call(elements, (element) => {
    return element.textContent.includes(text)
  }).length > 0
}

// extractors extract data from client html into json
const extractInsiders = (html) => {
    let insiders = []
    const parser = new DOMParser()
    const dom  = parser.parseFromString(html, 'text/html')
    const rows = dom.querySelectorAll('tr')
    for (let [index, row] of rows.entries()) {
        if (index == 0) continue
        let result = {} 
        if (row.className.includes('is-sale')) result.isSell =1
        else if (row.className.includes('is-buy')) result.isBuy =1
        let cells = row.querySelectorAll('td')
        result.insider = cells[0].querySelector('a').innerHTML
        result.relationship = cells[1].innerHTML
        result.date = cells[2].innerHTML
        result.transaction = cells[3].innerHTML
        result.cost = cells[4].innerHTML
        result.shares = cells[5].innerHTML
        result.value = cells[6].innerHTML
        result.sharesTotal = cells[7].innerHTML
        result.linkHref = cells[8].querySelector('a').getAttribute('href')
        result.linkText = cells[8].querySelector('a').innerHTML
        insiders.push(result)
    }
    return insiders
}

const renderInsiders = (json) => {
    let html = '<table id="ht-insiders-table">\n'
    for (const item of json) {
        html += '<tr>\n'
        html += '<td class="ht-insiders-date">' + item.date + '</td>\n'
        html += '<td'
        if (item.isSell) html += ' class="ht-insiders-sell"'
        else if (item.isBuy) html += ' class="ht-insiders-buy"'
        html += '>' + item.transaction + '</td>\n'
        html += '<td>$' + item.value + ' (' + item.shares + ' shs)</td>\n'
        html += '<td>' + item.insider + ' (' + item.relationship + ')</td>\n'
        html += '<td><a class="ht-insiders-link" href="' + item.linkHref + '" target="_blank">' + item.linkText + '</a></td>\n'
        html += '</tr>\n' 
    }
    html += '</table>\n'
    return html
}

const extractRatings = (html) => {
    let ratings = []
    html = html.replace(/<\/?b>/g, '')
    const parser = new DOMParser()
    const dom = parser.parseFromString(html, 'text/html')
    const ratingsNodes = dom.querySelectorAll('table table')   
    
    for (const ratingsNode of ratingsNodes) {
        let result = {}
        let ratingsRow = ratingsNode.querySelector('tr')
        let rowClass = ratingsRow.getAttribute('class')
        switch(rowClass.trim()) {
            case 'body-table-rating-downgrade':
                result.downgrade = 1
                break
            case 'body-table-rating-upgrade':
                result.upgrade = 1
                break
        }
     
        let cells = ratingsNode.querySelectorAll('td')
        result.date = cells[0].innerHTML
        result.action = cells[1].innerHTML
        result.analyst = cells[2].innerHTML
        result.rating = cells[3].innerHTML
        result.price = cells[4].innerHTML
        ratings.push(result)
    }
    return ratings  
}

const renderRatings = (json) => {
    let html = '<table id="ht-ratings-table">\n'
    for (const item of json) {
        html += '<tr'
        if (item.upgrade) html += ' class="ht-ratings-upgrade"'
        else if (item.downgrade) html += ' class="ht-ratings-downgrade"'    
        html += '>\n'
        html += '<td class="ht-ratings-date">' + item.date + '</td>\n'
        html += '<td>' + item.action + '</td>\n'
        html += '<td>' + item.analyst + '</td>\n'
        html += '<td>' + item.rating + '</td>\n'
        html += '<td class="ht-ratings-price">' + item.price + '</td>\n'
        html += '</tr>\n' 
    }
    html += '</table>\n'
    return html
}

const extractNews = (html) => {
    let news = []
    const parser = new DOMParser()
    const dom = parser.parseFromString(html, 'text/html')
    const newsTableNode = dom.querySelector('table')   
    let newsRowsNodes = newsTableNode.querySelectorAll('tr')

    for (const newsRowNode of newsRowsNodes) {  
        let result = {}
        let cells = newsRowNode.querySelectorAll('td')
        for (let cellNode of cells) {
            let linkNode = cellNode.querySelector('a')
            if (linkNode != null) {
                result.linkHref =  linkNode.getAttribute('href') 
                result.linkText = linkNode.innerHTML
                let spanNode = cellNode.querySelector('span')
                if (spanNode != null)
                   result.source = spanNode.innerHTML.trim() 
 
            }
            else 
                result.date =  cellNode.innerHTML.trim().replace(/\&nbsp;/g, '') 
        }
        news.push(result)
    }    
    return news
}

const renderNews = (json) => {
    let html = '<table id="ht-news-table">\n'
    for (const item of json) {
        html += '<tr>\n'
        html += '<td class="ht-news-date-cell">' + item.date + '</td>\n'
        html += '<td class="ht-news-link-cell"><a class="ht-news-link" href="' + item.linkHref + '" target="_blank">' + item.linkText + '</a><span class="ht-news-source">'+ item.source + '</span></td>\n'
        html += '</tr>\n' 
    }
    html += '</table>\n'
    return html
}

