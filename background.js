const SA_REGEX = /symbol\/([a-zA-Z]+)\/earnings/;
const ZA_REGEX = /stock\/research\/([a-zA-Z]+)\/earnings-announcements/;
const URL_PREFIX = 'https://finviz.com/';
const CHROME_PREFIX_REGEX = /chrome-extension:\/\/\w+\//;

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

    fetch('https://finviz.com/quote.ashx?t='+symbol)
    .then(function(response) {
        return response.text()
    })
    .then(function(html) {
        let dom_nodes = $($.parseHTML(html));

        found = dom_nodes.find('.fullview-title tr:eq(0) td');
        if (found) {
            results.ticker = found.children(':first-child').text();
            results.tickerHref = stripChromePrefix(found.children(':first-child').prop('href'));
            results.exchange = found.children(':first-child').next().text();
        }
        found = dom_nodes.find('.fullview-title tr:eq(1) td');
        if (found) {
            results.site = found.html();
        }
        found = dom_nodes.find('.fullview-title tr:eq(2) td');
        if (found) {
            results.sector = found.children(':first-child').text();
            results.sectorHref = stripChromePrefix(found.children(':first-child').prop('href'));
            results.industry = found.children(':first-child').next().text();
            results.industryHref = stripChromePrefix(found.children(':first-child').next().prop('href'));
            results.country = found.children(':first-child').next().next().text();
            results.countryHref = stripChromePrefix(found.children(':first-child').next().next().prop('href'));
        }

        found = dom_nodes.find('td:contains("Short Float")');
        if (found) {
            results.shorts = found.next().text().trim();
        }
        found = dom_nodes.find('td:contains("Shs Float")');
        if (found) {
            results.float = found.next().text().trim();
        }
        found = dom_nodes.find('td:contains("Earnings")');
        if (found) {
            results.earnings = found.next().text().trim();
        }
        found = dom_nodes.find('td:contains("Market Cap")');
        if (found) {
            results.mktcap = found.next().text().trim();
        }
        found = dom_nodes.find('td:contains("Volatility")');
        if (found) {
            results.adr = found.next().text().trim().split(' ')[1];
        }
        found = dom_nodes.find('td:contains("Inst Own")');
        if (found) {
            results.instown = found.next().text().trim();
        }
        found = dom_nodes.find('td:contains("Rel Volume")');
        if (found) {
            results.relvolume = found.next().text().trim();
        }
        found = dom_nodes.find('td:contains("Avg Volume")');
        if (found) {
            results.avgvolume = found.next().text().trim();
        }
        found = dom_nodes.find('.fullview-profile');
        if (found) {
            results.description = found.text().trim();
        }
        found = dom_nodes.find('.fullview-ratings-outer');
        if (found) {
            results.ratings = found.prop('outerHTML');
            results.ratings = results.ratings.replace(/<b>/g, "");
            results.ratings = results.ratings.replace(/<\/b>/g, "");
        }
        found = dom_nodes.find('.fullview-news-outer');
        if (found) {
            results.news = found.prop('outerHTML');
        }
        found = dom_nodes.find('td:contains("Insider Trading")');
        if (found) {
            results.insiders = processInsiders(found.closest('.body-table').prop('outerHTML'));
        }

        fetch('https://charts2.finviz.com/chart.ashx?t='+symbol+'&ty=c&ta=1&p=d&s=l')
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
function stripChromePrefix(str) {
    return str.replace(CHROME_PREFIX_REGEX, URL_PREFIX);
}

// remove onmouse* events from insiders
// prepend URL_PREFIX
function processInsiders(str) {
    if (!isDefined(str)) { return undefined; }
    let removed = str.replace(/ on\w+="[^"]*"/g, '');
    removed = removed.replace(/insidertrading\.ashx/g, URL_PREFIX + "insidertrading.ashx");
    return removed;
}

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
