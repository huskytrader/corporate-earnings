chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("message received: ", message);
   

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var regex = /symbol\/([a-zA-Z]+)\/earnings/;
        let url = tabs[0].url;
        let res = regex.exec(url);
        let symbol = res[1];
        getFundamentals(symbol, sendResponse);
    }); 
        
    return true;    
        //sendResponse(fundamentals);
    
});

function getSymbol() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var regex = /symbol\/([a-zA-Z]+)\/earnings/;
        let url = tabs[0].url;
        let res = regex.exec(url);
        return res[1];
    }); 
}

function getFundamentals(symbol, sendResponse) {
    if (! isDefined(symbol)) { return undefined; }
    let results = {symbol: symbol};

    console.log('queriyng Finviz for symbol: ', symbol);

    fetch('https://finviz.com/quote.ashx?t='+symbol)
    .then(function(response) {
        return response.text()
    })
    .then(function(html) {
        var dom_nodes = $($.parseHTML(html));

        let found = dom_nodes.find('.fullview-title');
        if (found) {
            results.title = found.html();
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

        console.log(results);
        //chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        //    chrome.tabs.sendMessage(tabs[0].id, results, function(response){});
        //});
        sendResponse(results);
    })
    .catch(function(err) {  
        console.log('Failed to fetch page: ', err);  
        results.error = err;
        //chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        //    chrome.tabs.sendMessage(tabs[0].id, results, function(response){});
        //});
        sendResponse({error: 'failed to fetch fundamentals for symbol: ${symbol}'});
    });
}

function isDefined(smth) {
    return typeof smth !== 'undefined';
}