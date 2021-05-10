// constants
const CHANGE_POSITIVE_COLOR = '#0000FF';
const CHANGE_NEGATIVE_COLOR = '#FF0000';
const SURPRISE_POSITIVE_COLOR = '#04C90A';

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

// default options
var show_earnings_surprise = false;
var default_ds = 1;
var ms_style_output = true;
var limit_num_qtr = true;

// init data structures
var epsDates = [];
var annualEst = [];

chrome.storage.local.get(['show_earnings_surprise', 'ms_style_output', 'limit_num_qtr', 'default_ds'], function(options) {
    if (isDefined(options.show_earnings_surprise)) { show_earnings_surprise = options.show_earnings_surprise; }
    if (isDefined(options.default_ds)) { default_ds = options.default_ds; } 
    if (isDefined(options.ms_style_output)) { ms_style_output = options.ms_style_output; }
    if (isDefined(options.limit_num_qtr)) { limit_num_qtr = options.limit_num_qtr; }

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
        waitForEl("div.earning-title", displayWhenReady, 30);
    }
    else if (default_ds == 2) {
        // ZA
        extractContent();
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

function displayWhenReady(el) {
    if(el == null) {
        $('#waiting').hide();
        $('body').prepend('<div class="mymsg">No earnings data available for this symbol.</div>');
        return;
    }
    extractContent();
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
       padding-left: 15px;
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
    .myd {
        text-align: right;
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
    $('body').prepend('<div class="container"><div class="column">' + yearlyToHtml(annualEst) + '</div>' + '<div class="column">' + epsDatesToHtml(epsDates) + '</div></div>');
}

function epsDatesToHtml(epsDates) {
    let html = '<table class="myt">';
    html += '<thead><tr class="myd"><td class="myd">Quarter</td><td class="myd">EPS</td><td class="myd">%Change</td>';
    if (show_earnings_surprise) {
        html += '<td class="myd">%Surprise</td>';
    }
    html += '<td class="myd">Revenue(Mil)</td><td class="myd">%Change</td>';
    if (show_earnings_surprise) {
        html += '<td class="myd">%Surprise</td>';
    }
    html += '</tr></thead><tbody>';
    
    if (epsDates.length == 0) {
        html += '<tr class="myd"><td class="myd" colspan="${show_earnings_surprise ? 7 : 5}">No data found</td></tr>';
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
            }
        }
        let surpriseEpsPerf = '-';
        if (isDefined(item.eps.surprisePerf)) {
            surpriseEpsPerf = item.eps.surprisePerf;
            if (item.eps.surprisePerf > 0) { surpriseEpsPerf = '+' + surpriseEpsPerf; }
        }
        let revPerf = '-';
        if (isDefined(item.rev.perf)) {
            if (ms_style_output == true && item.rev.perf >= 1000) {
                    revPerf = '999';   
            }
            else { revPerf = item.rev.perf; }
            if (item.rev.perf > 0) { revPerf = '+' + revPerf; }
        }
        let surpriseRevPerf = '-';
        if (isDefined(item.rev.surprisePerf)) {
            surpriseRevPerf = item.rev.surprisePerf;
            if (item.rev.surprisePerf > 0) { surpriseRevPerf = '+' + surpriseRevPerf; }
        }
        html += '<tr class="myd"><td class="myd">' + getDisplayQuarter(item.name) + '</td>';
        html += '<td class="myd">' + item.eps.eps + '</td>';
        html += '<td class="myd' + getHighlightClass4Change(item.eps.perf, epsPerf) + '">' + epsPerf + '</td>';
        if (show_earnings_surprise) {
            html += '<td class="myd' + getHighlightClass4Surprise(item.eps.surprisePerf, surpriseEpsPerf) + '">' + surpriseEpsPerf + '</td>';
        }
        html += '<td class="myd">' + numberWithCommas(item.rev.rev) + '</td>';
        html += '<td class="myd' + getHighlightClass4Change(item.rev.perf, revPerf) + '">' + revPerf  + '</td>';
        if (show_earnings_surprise) {
            html += '<td class="myd' + getHighlightClass4Surprise(item.rev.surprisePerf, surpriseRevPerf) + '">' + surpriseRevPerf + '</td>';
        }
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}

function yearlyToHtml(annualEst) {
    let html = '<table class="myt">';
    html += '<thead><tr class="myd"><td class="myd">Year</td><td class="myd">EPS</td><td class="myd">%Change</td><td class="myd">Revenue(Mil)</td><td class="myd">%Change</td></tr></thead><tbody>';
    
    if (annualEst.length == 0) {
        html += '<tr class="myd"><td class="myd" colspan="5">No data found</td></tr>';
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
        if (typeof item.epsPerf !== 'undefined') {
            epsPerf = item.epsPerf > 0 ? ('+' + item.epsPerf) : item.epsPerf;
        }
        let revPerf = '-';
        if (typeof item.revPerf !== 'undefined') {
            revPerf = item.revPerf > 0 ? ('+' + item.revPerf) : item.revPerf;
        }

        html += '<tr class="myd"><td class="myd">' + item.name + '</td>';
        html += '<td class="myd">' + yearlyEps + '</td>';
        html += '<td class="myd' + getHighlightClass4Change(item.epsPerf, epsPerf) + '">' + epsPerf + '</td>';
        html += '<td class="myd">' + numberWithCommas(yearlyRev) + '</td>';
        html += '<td class="myd' + getHighlightClass4Change(item.revPerf, revPerf) + '">' + revPerf  + '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
}

function getDisplayQuarter(qtr) {
    return qtr.substr(0,3) + '-' + qtr.substr(6);
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

function numberWithCommas(x) {
    if (!isDefined(x) || x == null) { return '-'; }
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function isDefined(smth) {
    return typeof smth !== 'undefined';
}

// end display
//
//
// extraction/preparation
//
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

function extractContent() {
    if (default_ds == 1) {
        // add quarters
        $('.panel-title.earning-title').each(function() {
            let epsItem = sa_createEpsItem(
                $(this).find('.title-period').text(), 
                $(this).find('.eps').text().trim().replace(/(\r\n|\n|\r)/gm, ""), 
                $(this).find('.revenue').contents().text().trim().replace(/(\r\n|\n|\r)/gm, ""));

            if (!(epsItem.name === undefined || epsItem.name.length == 0 || epsItem.eps.eps === undefined || isNaN(epsItem.eps.eps))) {
                epsDates.unshift(epsItem);
            }
        });

        // add annual eps estimates
        $('#annual-eps-esimates-tbl tbody .row-content').each(function() {
            let annualItem = {};
            $(this).children().each(function(index) {
                if (index == 0) {
                    annualItem.name = "*" + getAnnualEstimateName($(this).text().trim());
                } else if (index == 1) {
                    annualItem.eps = $(this).text().trim();
                    annualItem.qtrs4Year = 4;
                }
            });
            annualEst.push(annualItem);
        });

        // add annual revenue estimates
        $('#annual-rev-esimates-tbl tbody .row-content').each(function(index) {
            $(this).children().each(function(index2) {
                if (index2 == 1) {
                    annualEst[index].rev = revenueStringToFloat($(this).text().trim());
                }
            })
        })
    }
    else if (default_ds == 2) {
        let data = $('#earnings_announcements_tabs').next().html().trim();
        data = data.substr(data.indexOf('{'));
        data = data.substr(0, data.lastIndexOf('}')+1);
        let dataObj = JSON.parse(data);
        dataObj.earnings_announcements_earnings_table.forEach(function(item, index){
            let epsItem = za_createEpsItem(
                item[1],
                item[3],
                item[5], 
                dataObj.earnings_announcements_sales_table);        
            if (!(typeof epsItem.name === 'undefined' || epsItem.name.length == 0 || typeof epsItem.eps.eps === 'undefined' || isNaN(epsItem.eps.eps))) {
                epsDates.unshift(epsItem);
            }
        });
    }
    // with data extraction completed, perform calculations
    calculateQuarterlyPerf(epsDates);
    calculateAnnual(epsDates, annualEst);
}

// SA
// TODO: refactor into separate class
function sa_createEpsItem(nameStr, epsStr, revStr) {
    let epsItem = {};
    let nameAttr = sa_parseQtrName(nameStr);
    epsItem.name = nameAttr.name;
    epsItem.month = nameAttr.month;
    epsItem.year = parseInt(nameAttr.year);
    epsItem.eps = sa_parseQtrEps(epsStr);
    epsItem.rev = sa_parseQtrRev(revStr);
    return epsItem;
}

// extracts qtr name in the form mmm yyyy
function sa_parseQtrName(str) {
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
function sa_parseQtrEps(str) {
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
            eps.surprisePerf = sa_calculateSurpriseEPSPerf(str.substr(sPos+1).trim(), eps.eps);
        }
    }
    return eps;
}

function sa_calculateSurpriseEPSPerf(str, eps) {
    if (!isDefined(str)) { return undefined; }
    let dPos = str.indexOf('$');
    if (dPos < 0) { return undefined; }

    let sign = '';
    if (str.substr(dPos-1,1) == '-') {
        sign = '-';
    }
    let surprise = parseFloat((sign + str.substr(dPos+1)).trim());
    let projectedEps = eps - surprise;
    let surprisePerf = Math.round(100*((eps - projectedEps) / Math.abs(projectedEps)));
    return surprisePerf;
}

/*
   Parse quaterly revenue string. String can be in the form:

   Revenue of $112.33M (54.30% YoY) beat by $8.47M
   Revenue of $112.33M beat by $8.47M
   Revenue of $112.33M
*/
function sa_parseQtrRev(str) {
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

    rev.rev = revenueStringToFloat(revStr);
    rev.surprisePerf = sa_calculateSurpriseRevPerf(rev.surprisePerf, rev.rev);
    return rev;
}

function sa_calculateSurpriseRevPerf(str, rev) {
    if (!isDefined(str)) { return undefined; }
    let dPos = str.indexOf('$');
    if (dPos < 0) { return undefined; }

    let sign = '';
    if (str.substr(dPos-1,1) == '-') {
        sign = '-';
    }
    let surprise = revenueStringToFloat((sign + str.substr(dPos+1)).trim());
    let projectedRev = rev - surprise;
    let surpriseRev = Math.round(100*((rev - projectedRev) / Math.abs(projectedRev)));
    return surpriseRev;
}
// end SA
// ZA
function za_createEpsItem(nameStr, epsStr, epsSurpriseStr, revData) {
    let epsItem = {};
    let nameAttr = za_parseQtrName(nameStr);
    epsItem.name = nameAttr.name;
    epsItem.month = nameAttr.month;
    epsItem.year = parseInt(nameAttr.year);
    epsItem.eps = za_parseQtrEps(epsStr, epsSurpriseStr);
    epsItem.rev = za_parseQtrRev(nameStr, revData);
    return epsItem;
}

function za_parseQtrName(str) {
    let qtr = {};
    let parts = str.split('/');
    let month = parseInt(parts[0]);
    let year = parseInt(parts[1]);
    qtr.name = MONTH_MAP[month] + ' ' + year;
    qtr.month = MONTH_MAP[month];
    qtr.year = year;
    return qtr;
}

function za_parseQtrEps(epsStr, epsSurpriseStr) {
    let eps = {};
    eps.eps =  parseFloat(epsStr.replace(/\$/, ''));
    epsSurpriseStr = epsSurpriseStr.substr(epsSurpriseStr.indexOf('>') + 2).slice(0, -7);
    eps.surprisePerf = Math.round(parseFloat(epsSurpriseStr));
    return eps;
}

function za_parseQtrRev(period, revData) {
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
// end ZA

// to calculate quarterly performance (%Chg), compare with same quarter 1 year back
function calculateQuarterlyPerf(dates) {
   dates.map(function(qtr, index) {
        let compQuarter = dates.find(q => q.name == getComparativeQuarterName(qtr));
        if (isDefined(compQuarter)) {
            if (compQuarter.eps.eps != 0) {
               qtr.eps.negativeCompQtr = false; 
               qtr.eps.negativeTurnaround = false;
               qtr.eps.perf = Math.round(100*((qtr.eps.eps - compQuarter.eps.eps) / Math.abs(compQuarter.eps.eps)));
               if (qtr.eps.eps < 0 && compQuarter.eps.eps) {
                    qtr.eps.negativeCompQtr = true;
               }
               else if (compQuarter.eps.eps < 0) {
                    qtr.eps.negativeTurnaround = true;
               }
           }
           if (qtr.rev.rev != 0 && !isDefined(qtr.rev.perf) && compQuarter.rev.rev != 0) {
                qtr.rev.perf = Math.round(100*((qtr.rev.rev - compQuarter.rev.rev) / Math.abs(compQuarter.rev.rev)));
           }
       }
       
   });
}

function calculateAnnual(epsDates, annualEst) {
    // calculate eps/revenue for previous years using existing quaterly data
    // getLatestYear to get year for latest quarter available (e.g. 2020)
    // attempt to find all quarters for given year
    // if found 0 quarters, exit
    let numAttempts = 0;
    if (epsDates.length > 0) {
        let year = getLatestQtrYear(epsDates);
        while (true) {
            let annualItem = {};
            annualItem.name = year;
            annualItem.eps = 0;
            annualItem.rev = 0;
            let qtrs4Year = 0;

            epsDates.forEach(function(qtr) {
                if (qtr.name.indexOf(year.toString()) > -1) {
                    annualItem.eps += qtr.eps.eps;
                    annualItem.rev += qtr.rev.rev;
                    ++qtrs4Year;
                }
            })

            if (qtrs4Year == 0) {
                break;
            }

            if (qtrs4Year == 4) {
                annualItem.eps = +annualItem.eps.toFixed(2);
                annualItem.rev = +annualItem.rev.toFixed(1);
                annualItem.qtrs4Year = qtrs4Year;
                annualEst.unshift(annualItem);
            }
            --year;
        }
    }
    calculateAnnualPerf(annualEst);
}

// TO calculate annual performance (%Chg), compare with previous year
function calculateAnnualPerf(dates) {
   dates.map(function(item, index) {
       if (index-1 >= 0 && item.qtrs4Year == 4 && dates[index-1].qtrs4Year == 4) {
           // previous year available. present year and previous have 4 qtrs.
           if (dates[index-1].eps != 0) {
               item.epsPerf = Math.round(100*((item.eps - dates[index-1].eps) / Math.abs(dates[index-1].eps)));
           }
           if (dates[index-1].rev != 0) {
               item.revPerf = Math.round(100*((item.rev - dates[index-1].rev) / Math.abs(dates[index-1].rev)));
           }
       }
   });
}

function getComparativeQuarterName(qtr) {
    return qtr.month + ' ' + (qtr.year - 1);
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
