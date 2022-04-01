const SA_REGEX = /symbol\/([a-zA-Z]+)\/earnings/;
const ZA_REGEX = /stock\/research\/([a-zA-Z]+)\/earnings-calendar/;

const FETCH_URL = 'aHR0cHM6Ly9maW52aXouY29tL3F1b3RlLmFzaHg/dD0='
const FETCH_URL_PREFIX = 'aHR0cHM6Ly9maW52aXouY29tLw==';
const IMAGE_URL = 'aHR0cHM6Ly9jaGFydHMyLmZpbnZpei5jb20vY2hhcnQuYXNoeD90PQ==';

const CHART_TYPE = {
    NONE: 1,
    WEEKLY : 2,
    DAILY: 3,
    BOTH: 4
};

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

        results.raw = response;
        const charts = await fetchImages(symbol, chartType);
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
    return btoa(binary);
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

