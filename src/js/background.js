const SA_REGEX = /symbol\/([a-zA-Z]+)\/earnings/;
const ZA_REGEX = /stock\/research\/([a-zA-Z]+)\/earnings-announcements/;

const FETCH_URL = 'aHR0cHM6Ly9maW52aXouY29tL3F1b3RlLmFzaHg/dD0='
const FETCH_URL_PREFIX = 'aHR0cHM6Ly9maW52aXouY29tLw==';
const IMAGE_URL = 'aHR0cHM6Ly9jaGFydHMyLmZpbnZpei5jb20vY2hhcnQuYXNoeD90PQ==';
const CHROME_PREFIX_REGEX = /chrome-extension:\/\/\w+\//;
const FIREFOX_PREFIX_REGEX = /moz-extension:\/\/((\w{4,12}-?)){5}\//;

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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        let symbol = "";
        let url = tabs[0].url;
        let res = SA_REGEX.exec(url);
        if (res != null) {
            symbol = res[1];
            getFundamentals(symbol, sendResponse);
            return true;
        } 
        res = ZA_REGEX.exec(url);
        if (res != null) {
            symbol = res[1];
            getFundamentals(symbol, sendResponse);
            return true;
        }
        sendResponse({error: 'failed to fetch fundamentals'});

    });     
    return true;        
});

function getFundamentals(symbol, sendResponse) {
    if (! isDefined(symbol)) { return undefined; }
    let results = {symbol: symbol};

    let responseStatus = 0;
    fetch(decode(FETCH_URL)+symbol)
    .then(function(response) {
        responseStatus = response.status;
        return response.text();
    })
    .then(function(response) {
        if (responseStatus != 200) {
            sendResponse({error: 'failed to fetch fundamentals for symbol: ' + symbol});
            return;
        }
        let dom_nodes = $($.parseHTML(response));

        found = dom_nodes.find('.fullview-title tr:eq(0) td');
        if (found.length > 0) {
            results.ticker = found.children(':first-child').text();
            results.tickerHref = stripBrowserPrefix(found.children(':first-child').prop('href'));
            results.exchange = found.children(':first-child').next().text();
        }
        found = dom_nodes.find('.fullview-title tr:eq(1) td');
        if (found.length > 0) {
            results.site = found.html();
            results.companyName = found.text();
        }
        found = dom_nodes.find('.fullview-title tr:eq(2) td');
        if (found.length > 0) {
            results.sector = found.children(':first-child').text();
            results.sectorHref = stripBrowserPrefix(found.children(':first-child').prop('href'));
            results.industry = found.children(':first-child').next().text();
            results.industryHref = stripBrowserPrefix(found.children(':first-child').next().prop('href'));
            results.country = found.children(':first-child').next().next().text();
            results.countryHref = stripBrowserPrefix(found.children(':first-child').next().next().prop('href'));
        }
        found = dom_nodes.find('td:contains("Short Float")');
        if (found.length > 0) {
            results.shorts = found.next().text().trim();
        }
        found = dom_nodes.find('td:contains("Shs Float")');
        if (found.length > 0) {
            results.float = found.next().text().trim();
        }
        found = dom_nodes.find('td:contains("Earnings")');
        if (found.length > 0) {
            processEarnings(found.next().text().trim(), results);
        }
        found = dom_nodes.find('td:contains("Market Cap")');
        if (found.length > 0) {
            results.mktcap = found.next().text().trim();
        }
        found = dom_nodes.find('td:contains("Volatility")');
        if (found.length > 0) {
            results.adr = found.next().text().trim().split(' ')[1];
        }
        found = dom_nodes.find('td:contains("Inst Own")');
        if (found.length > 0) {
            results.instown = found.next().text().trim();
        }
        found = dom_nodes.find('td:contains("Rel Volume")');
        if (found.length > 0) {
            results.relvolume = found.next().text().trim();
        }
        found = dom_nodes.find('td:contains("Avg Volume")');
        if (found.length > 0) {
            results.avgvolume = found.next().text().trim();
        }
        found = dom_nodes.find('.fullview-profile');
        if (found.length > 0) {
            results.description = found.text().trim();
            // chop off company name as it's redundant
            if (results.description.startsWith(results.companyName)) {
                results.description = results.description.substr(results.companyName.length + 1);
            }
        }
        found = dom_nodes.find('.fullview-ratings-outer');
        if (found.length > 0) {
            results.ratings = found.prop('outerHTML');
            results.ratings = results.ratings.replace(/<b>/g, "");
            results.ratings = results.ratings.replace(/<\/b>/g, "");
        }
        found = dom_nodes.find('.fullview-news-outer');
        if (found.length > 0) {
            results.news = found.prop('outerHTML');
        }
        found = dom_nodes.find('td:contains("Insider Trading")');
        if (found.length > 0) {
            results.insiders = processInsiders(found.closest('.body-table').prop('outerHTML'));
        }

        fetch(decode(IMAGE_URL)+symbol+'&ty=c&ta=1&p=d&s=l')
            .then(response => response.arrayBuffer())
            .then(buf => {
                    results.chart = arrayBufferToBase64(buf);
                    sendResponse(results);
                })
            .catch (err => {
                console.log('Failed to fetch image: ', err);
                sendResponse(results);
            });

    })
    .catch(function(err) {  
        console.log('Failed to fetch page: ', err);  
        results.error = err;
        sendResponse({error: 'failed to fetch fundamentals for symbol: ' + symbol});
    });
}

// Chrome prepends chrome-extension://adcd/
// Firefox prepends mozilla-extension://uuid/
function stripBrowserPrefix(str) {
    let res = str.replace(CHROME_PREFIX_REGEX, decode(FETCH_URL_PREFIX));
    res = res.replace(FIREFOX_PREFIX_REGEX, decode(FETCH_URL_PREFIX));
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
    results.daysToEarnings = getWorkingDays(today, earningsDate);
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

function isDefined(smth) {
    return typeof smth !== 'undefined';
}

function arrayBufferToBase64(buffer) {
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
    return decodeURIComponent(escape(window.atob(str)));
}
