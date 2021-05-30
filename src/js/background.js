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

const CHART_TYPE = {
    NONE: 1,
    WEEKLY : 2,
    DAILY: 3,
    BOTH: 4
};
Object.freeze(CHART_TYPE);


chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        let url = tabs[0].url;            
        const symbol = getSymbol(url);
        fetchFundamentals(symbol, message, sendResponse);
    });     
    return true;        
});

function fetchFundamentals(symbol, message, sendResponse) {
    if (! isDefined(symbol)) { return undefined; }
    let charType = CHART_TYPE.NONE;
    if (isDefined(message.chart_type)) { chartType = parseInt(message.chart_type); }

    const results = {symbol: symbol};
    let responseStatus = 0;
    fetch(decode(FETCH_URL)+symbol)
    .then(function(response) {
        responseStatus = response.status;
        return response.text();
    })
    .then(async function(response) {
        if (responseStatus != 200) {
            sendResponse({error: 'failed to fetch fundamentals for symbol: ' + symbol});
            return;
        }
        let dom = $($.parseHTML(response));

        found = dom.find('.fullview-title tr:eq(0) td');
        if (found.length > 0) {
            results.ticker = found.children(':first-child').text();
            results.tickerHref = stripBrowserPrefix(found.children(':first-child').prop('href'));
            results.exchange = found.children(':first-child').next().text();
        }
        found = dom.find('.fullview-title tr:eq(1) td');
        if (found.length > 0) {
            results.site = found.html();
            results.companyName = found.text();
        }
        found = dom.find('.fullview-title tr:eq(2) td');
        if (found.length > 0) {
            results.sector = found.children(':first-child').text();
            results.sectorHref = stripBrowserPrefix(found.children(':first-child').prop('href'));
            results.industry = found.children(':first-child').next().text();
            results.industryHref = stripBrowserPrefix(found.children(':first-child').next().prop('href'));
            results.country = found.children(':first-child').next().next().text();
            results.countryHref = stripBrowserPrefix(found.children(':first-child').next().next().prop('href'));
        }
        found = dom.find('td:contains("Short Float")');
        if (found.length > 0) {
            results.shorts = found.next().text().trim();
        }
        found = dom.find('td:contains("Shs Float")');
        if (found.length > 0) {
            results.float = found.next().text().trim();
        }
        found = dom.find('td:contains("Earnings")');
        if (found.length > 0) {
            processEarnings(found.next().text().trim(), results);
        }
        found = dom.find('td:contains("Market Cap")');
        if (found.length > 0) {
            results.mktcap = found.next().text().trim();
        }
        found = dom.find('td:contains("Volatility")');
        if (found.length > 0) {
            results.adr = found.next().text().trim().split(' ')[1];
        }
        found = dom.find('td:contains("Inst Own")');
        if (found.length > 0) {
            results.instown = found.next().text().trim();
        }
        found = dom.find('td:contains("Rel Volume")');
        if (found.length > 0) {
            results.relvolume = found.next().text().trim();
        }
        found = dom.find('td:contains("Avg Volume")');
        if (found.length > 0) {
            results.avgvolume = found.next().text().trim();
        }
        found = dom.find('.fullview-profile');
        if (found.length > 0) {
            results.description = found.text().trim();
            // chop off company name and optional 'together with its subsidiaries, '
            const regex = new RegExp('^'+results.companyName+',? (together with its subsidiaries, )?');
            results.description = results.description.replace(regex, '');
        }
        found = dom.find('.fullview-ratings-outer');
        if (found.length > 0) {
            results.ratings = found.prop('outerHTML');
            results.ratings = results.ratings.replace(/<\/?b>/g, '');
        }
        found = dom.find('.fullview-news-outer');
        if (found.length > 0) {
            results.news = found.prop('outerHTML');
        }
        found = dom.find('td:contains("Insider Trading")');
        if (found.length > 0) {
            results.insiders = processInsiders(found.closest('.body-table').prop('outerHTML'));
        }
     
        const charts = await fetchImages(symbol, chartType, sendResponse);
        if (isDefined(charts)) {
            switch(chartType) {
                case CHART_TYPE.WEEKLY:
                    results.weeklyChart = charts[0];
                    break;
                case CHART_TYPE.DAILY:
                    results.dailyChart = charts[0];
                    break;
                case CHART_TYPE.BOTH:
                    results.weeklyChart = charts[0];
                    results.dailyChart = charts[1];
                    break;
            }
        }
        sendResponse(results);
    })
    .catch(function(err) {  
        console.log('Failed to fetch page: ', err);  
        results.error = err;
        sendResponse({error: 'failed to fetch fundamentals for symbol: ' + symbol});
    });
}

async function fetchImages(symbol, chartType) {
    let urls = [];
    switch(chartType) {
        case CHART_TYPE.WEEKLY:
        case CHART_TYPE.BOTH:
            urls.push(decode(IMAGE_URL)+symbol+'&ty=c&ta=0&p=w&s=l');
        case CHART_TYPE.DAILY:
        case CHART_TYPE.BOTH:
            urls.push(decode(IMAGE_URL)+symbol+'&ty=c&ta=1&p=d&s=l');
    }
    if (urls.length == 0) { return undefined; }
    try {
        let data = await Promise.all(
            urls.map(url =>
                fetch(url)
                .then((response) => response.arrayBuffer())
                .then(buf => arrayBufferToBase64(buf))
        ));
        return (data)

    } catch (error) {
        console.log(error)
        throw (error)
    }
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
    return decodeURIComponent(escape(window.atob(str)));
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
