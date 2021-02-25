window.onload=function(){
    $('#main-nav-wrapper-row').hide();
    $('#tab-content-header').hide();
    $('#sp-center-menu').hide();

    $('.symbol_title').hide();

    $('#estimates').hide();
    $('#cresscap').hide();

    $('.panel-body').hide();
    $('#breaking-news').hide();
    $('.col-xs-3').hide();

    let epsDates = [];
    $('.panel-title.earning-title').each(function() {
        let epsItem = {};
        epsItem.name = normalizeQtrName($(this).find('.title-period').text());
        epsItem.eps = parseQtrEps($(this).find('.eps').text().trim().replace(/(\r\n|\n|\r)/gm, ""));
        epsItem.rev = parseQtrRev($(this).find('.revenue').contents().text().trim().replace(/(\r\n|\n|\r)/gm, ""));

        if (!(epsItem.name === undefined || epsItem.name.length == 0 || epsItem.eps.eps === undefined || isNaN(epsItem.eps.eps))) {
            epsDates.unshift(epsItem);
            calculateEpsPerf(epsDates);
        }

    });

    // add annual eps estimates
    let annualEst = [];
    $('#annual-eps-esimates-tbl tbody .row-content').each(function() {
        let annualItem = {};
        $(this).children().each(function(index) {
            if (index == 0) {
                annualItem.name = "*" + getAnnualEstimateName($(this).text().trim());
            } else if (index == 1) {
                annualItem.eps = $(this).text().trim();
            }
        });
        annualEst.push(annualItem);
    });

    // add annual revenue estimates
    $('#annual-rev-esimates-tbl tbody .row-content').each(function(index) {
        $(this).children().each(function(index2) {
            if (index2 == 1) {
                annualEst[index].rev = normalizeRevenue($(this).text().trim());
            }
        })
    })

    // calculate eps/revenue for previous years using existing quaterly data
    // keep going back until can't find 4 qtrs for that year
    let numAttempts = 0;
    if (epsDates.length > 0) {
        let year = getLatestQtrYear(epsDates);
        while (true) {
            let annualItem = {};
            annualItem.name = year;
            annualItem.eps = 0;
            annualItem.rev = 0;
            let numQtrs4Year = 0;

            epsDates.forEach(function(item) {
                if (item.name.indexOf(year.toString()) > -1) {
                    annualItem.eps += item.eps.eps;
                    annualItem.rev += item.rev.rev;
                    ++numQtrs4Year;
                }
            })

            ++numAttempts;
            --year;

            if (numQtrs4Year < 4) {
                if (numAttempts < 2) {
                    continue;
                }
                else {
                    break;
                }
            }
            annualItem.eps = +annualItem.eps.toFixed(1);
            annualItem.rev = +annualItem.rev.toFixed(1);
            annualEst.unshift(annualItem);
        }
    }

    calculateAnnualPerf(annualEst);

    const css = `<style>
       .myt {
         float: left;
         border-collapse: collapse;
         margin: 25px 100px 25px 25px;
         padding-left: 15px;
         font-family: sans-serif;
         min-width: 400px;
         box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
       }
       .myt thead tr {
         background-color: #333333;
         color: #ffffff;
         text-align: left;
       }
       .myt th,
       .myt td {
         padding: 12px 15px;
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
      .myt tbody tr .sgreen {
        color: #0000FF;
        font-weight: bold;
      }
      .myt tbody tr .wgreen {
        color: #0000FF;
      }
      .myt tbody tr .sred {
        color: #FF0000;
        font-weight: bold;
      }
      .myt tbody tr .wred {
        color: #FF0000;
      }     
      .container {
        overflow: hidden;
        margin-bottom: 50px;
      }
      .column {
        float: left;
        margin: 10px;
        padding-bottom: 100%;
        margin-bottom: -100%;
     }

    </style>`;

    $('head').prepend(css);
    $('body').prepend('<div class="container"><div class="column">' + yearlyToHtml(annualEst) + '</div>' + '<div class="column">' + epsDatesToHtml(epsDates) + '</div></div>');

};

function getLatestQtrYear(epsDates) {
  if (epsDates.length == 0) { return undefined; }
  let lastQtrName = epsDates[epsDates.length-1].name;
  let year = parseInt(lastQtrName.substr(lastQtrName.indexOf(' ')+1));
  return year;
}

function epsDatesToHtml(epsDates) {
    let html = '<table class="myt">';
    html += '<thead><tr class="myd"><td class="myd">Quarter</td><td class="myd">EPS</td><td class="myd">%Chg</td><td class="myd">Revenue(Mil)</td><td class="myd">%Chg</td></tr></thead><tbody>';
    epsDates.forEach(function(item, index){
        if (index < epsDates.length - 8) { return; }
        let epsPerf = '-';
        if (typeof item.eps.perf !== 'undefined') {
            epsPerf = item.eps.perf > 0 ? ('+' + item.eps.perf) : item.eps.perf;
        }
        let revPerf = '-';
        if (typeof item.rev.perf !== 'undefined') {
            revPerf = item.rev.perf > 0 ? ('+' + item.rev.perf) : item.rev.perf;
        }
        html += '<tr class="myd"><td class="myd">' + item.name + '</td>';
        html += '<td class="myd">' + item.eps.eps + '</td>';
        html += '<td class="myd' + getHighlightClass(item.eps.perf) + '">' + epsPerf + '</td>';
        html += '<td class="myd">' + numberWithCommas(item.rev.rev) + '</td>';
        html += '<td class="myd' + getHighlightClass(item.rev.perf) + '">' + revPerf  + '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
}

function yearlyToHtml(annualEst) {
    let html = '<table class="myt">';
    html += '<thead><tr class="myd"><td class="myd">Year</td><td class="myd">EPS</td><td class="myd">%Chg</td><td class="myd">Revenue(Mil)</td><td class="myd">%Chg</td></tr></thead><tbody>';
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
        html += '<td class="myd' + getHighlightClass(item.epsPerf) + '">' + epsPerf + '</td>';
        html += '<td class="myd">' + numberWithCommas(yearlyRev) + '</td>';
        html += '<td class="myd' + getHighlightClass(item.revPerf) + '">' + revPerf  + '</td></tr>';
    });
    html += '</tbody></table>';
    return html;
}

function toNum(str) {
    let num = parseFloat(str);
    if (str.endsWith('M')) {
        num *= 1000000;
    }
    else if (str.endsWith('B')) {
        num *= 1000000000;
    }
    return num;
}

function fromNum(num) {
    let str = num.toFixed(2);
    return str;
}

// to calculate eps performance, compare with entry 4 qtrs back
function calculateEpsPerf(dates) {
     dates.map(function(item, index) {
         if (index-4 > 0 && dates[index-4].eps.eps != 0) {
             item.eps.perf = Math.round(100*((item.eps.eps - dates[index-4].eps.eps) / Math.abs(dates[index-4].eps.eps)));
         }
     });
}

// TO calculate annual performance, compare with previous year
function calculateAnnualPerf(dates) {
     dates.map(function(item, index) {
         if (index-1 >= 0) {
             if (dates[index-1].eps != 0) {
                 item.epsPerf = Math.round(100*((item.eps - dates[index-1].eps) / Math.abs(dates[index-1].eps)));
             }
             if (dates[index-1].rev != 0) {
                 item.revPerf = Math.round(100*((item.rev - dates[index-1].rev) / Math.abs(dates[index-1].rev)));
             }
         }
     });
}

/*
   Parse quaterly EPS string. String can be in the form:

   Q2 2020 (Jun 2020) EPS of -$0.31 beat by $0.05/missed by $0.05
   Q2 2020 (Jun 2020) GAAP EPS of $0.01

*/
function parseQtrEps(str) {
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
            eps.beat = str.substr(sPos+1).trim();
        }
    }
    return eps;
}

/*
   Parse quaterly revenue string. String can be in the form:

   Revenue of $112.33M (54.30% YoY) beat by $8.47M
   Revenue of $112.33M beat by $8.47M
   Revenue of $112.33M
*/
function parseQtrRev(str) {
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
            rev.beat = str.substr(sPos+1).trim();
        }
    }
    else {
        revStr = str.substr(12+1, pos-12-1).trim();
        rev.perf = Math.round(parseFloat(str.substr(pos+1, str.indexOf('%')-1-pos)));
        rev.beat = str.substr(str.indexOf(')')+1).trim();
    }

    rev.rev = normalizeRevenue(revStr);
    return rev;
}

function normalizeRevenue(revStr) {
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

function normalizeQtrName(str) {
    let start = str.indexOf('(')+1;
    let qtr = str.substr(start, str.indexOf(')')-start);
    return qtr;
}


/*
   Returns appropriate highlight class for EPS and revenue values
   >= 30 : strong green
   >0 && < 30 : weak green
   <0 && >-20 : weak read
   < -20 : strong red
*/
function getHighlightClass(num) {
    let hclass = '';
    if (typeof num !== 'undefined') {
        if (num >= 30) {
            hclass = ' sgreen';
        } else if (num > 0 && num < 30) {
            hclass = ' wgreen';
        } else if (num < 0 && num > -20) {
            hclass = ' wred';
        }
        else if (num <= -20) {
            hclass = ' sred';
        }
    }
    return hclass;
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function getAnnualEstimateName(str) {
    let start = str.indexOf(' ');
    if (start > -1) {
        return str.substr(start+1);
    }
    return start;
}