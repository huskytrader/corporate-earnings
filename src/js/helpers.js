function hideNativeContent() {
    let elem = document.querySelector("#ht-waiting").nextElementSibling;
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
        if (cells.length > 0 && cells[0] != "") {
            rows.push(cells);
        }
    });
    return rows;
}

// Helpers
function getComparativeQuarterName(qtr) {
    return qtr.month + " " + (qtr.year - 1);
}

function getDisplayQuarter(qtr) {
    return qtr.substr(0, 3) + "-" + qtr.substr(6);
}

function revenueStringToFloat(revStr) {
    revStr = revStr.trim();
    if (revStr.endsWith("M")) {
        return parseFloat(parseFloat(revStr).toFixed(1));
    } else if (revStr.endsWith("K")) {
        return parseFloat((parseFloat(revStr) / 1000).toFixed(2));
    } else if (revStr.endsWith("B")) {
        return Math.round(parseFloat(revStr) * 1000);
    } else {
        return parseFloat((parseFloat(revStr) / 1000).toFixed(2));
    }
}

function getAnnualEstimateYear(str) {
    let start = str.indexOf(" ");
    if (start > -1) {
        return parseInt(str.substr(start + 1));
    }
    return parseInt(start);
}

function getLatestQtrYear(quarterlyData) {
    if (quarterlyData.length == 0) {
        return undefined;
    }
    let lastQtrName = quarterlyData[quarterlyData.length - 1].name;
    let year = parseInt(lastQtrName.substr(lastQtrName.indexOf(" ") + 1));
    return year;
}

function calculatePercentChange(current, previous) {
    if (!isDefined(current) || !isDefined(previous) || previous == 0) {
        return undefined;
    }
    return Math.round(100 * ((current - previous) / Math.abs(previous)));
}

function isQuarterValid(qtr) {
    return (
        isDefined(qtr.name) &&
        qtr.name.length > 0 &&
        isDefined(qtr.eps.eps) &&
        !isNaN(qtr.eps.eps)
    );
}

function isAbleToCalculateQtrRevChange(qtr, compQuarter) {
    return (
        isDefined(qtr.rev.rev) &&
        qtr.rev.rev != 0 &&
        isDefined(compQuarter.rev.rev) &&
        compQuarter.rev.rev != 0
    );
}

function numberWithCommas(x) {
    if (!isDefined(x) || x == null) {
        return "-";
    }
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function isDefined(smth) {
    return typeof smth !== "undefined";
}

// Chrome prepends chrome-extension://adcd/
// Firefox prepends mozilla-extension://uuid/
function fixExternalLink(str) {
    let res = str.replace(CHROME_PREFIX_REGEX, decode(FETCH_URL_PREFIX));
    res = res.replace(FIREFOX_PREFIX_REGEX, decode(FETCH_URL_PREFIX));
    if (!res.startsWith("http")) res = decode(FETCH_URL_PREFIX) + res;
    return res;
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
    if (!buffer || buffer.length == 0) {
        return undefined;
    }
    let binary = "";
    let bytes = new Uint8Array(buffer);
    let len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function decode(str) {
    if (!isDefined(str)) {
        return undefined;
    }
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
    return arr[arr.findIndex((el) => el.textContent === txt) + 1].textContent;
}

// prepends html to body
const bodyPrepend = (html) => {
    document.body.insertAdjacentHTML("afterbegin", html);
};

const headPrepend = (html) => {
    document.head.insertAdjacentHTML("afterbegin", html);
};

const hide = (element) => {
    if (element != null && element.style != null)
        element.style.display = "none";
};

// show an element
const show = (element) => {
    if (element != null && element.style != null)
        element.style.display = "table";
};

// toggle the element visibility
const toggle = (element) => {
    if (element != null && element.style != null) {
        if (element.style.display === "none") {
            element.style.display = "table";
        } else {
            element.style.display = "none";
        }
    }
};

const contains = (selector, text) => {
    const elements = document.querySelectorAll(selector);
    return (
        [].filter.call(elements, (element) => {
            return element.textContent.includes(text);
        }).length > 0
    );
};

function isAdrLow(adrStr) {
    if (!isDefined(adrStr) || adrStr.length == 0) return false;
    let adr = parseFloat(adrStr.replace(/%$/, ""));
    if (adr < LOW_ADR_THRESHOLD) {
        return true;
    }
    return false;
}

function isShortInterestHigh(shortsStr) {
    if (!isDefined(shortsStr) || shortsStr.length == 0 || shortsStr == "-")
        return false;
    let shorts = parseFloat(shortsStr.replace(/%$/, ""));
    if (shorts > HIGH_SHORT_INTEREST_THRESHOLD) {
        return true;
    }
    return false;
}

function isHighInstitutionalOwnershipChange(instChangeStr) {
    if (
        !isDefined(instChangeStr) ||
        instChangeStr.length == 0 ||
        instChangeStr == "-"
    )
        return false;
    let instChange = parseFloat(instChangeStr.replace(/%$/, ""));
    if (instChange > HIGH_INST_CHANGE_THRESHOLD) {
        return true;
    }
    return false;
}

function strToNum(str) {
    if (!isDefined(str)) return 0;
    str = str.replace(/[^\d.-]/g, "");
    if (str == "") return 0;
    return parseFloat(str);
}

function isEarningsDateClose(earningsStr, daysToEarnings) {
    if (
        !isDefined(earningsStr) ||
        earningsStr.length == 0 ||
        earningsStr == "-"
    )
        return false;
    if (
        isDefined(daysToEarnings) &&
        daysToEarnings <= DAYS_BEFORE_EARNINGS_WARN_THRESHOLD
    ) {
        return true;
    }
    return false;
}

/*
   Returns appropriate highlight class for EPS and revenue change values
   >= 30 : bold positive 
   >0 && < 30 : positive
   <0 && >-20 : negative
   < -20 : bold negative
*/
function getHighlightClass4Change(num, str) {
    let hclass = "";
    if (str === "N/A") {
        return hclass;
    }
    if (!isDefined(num)) {
        return hclass;
    }

    if (num >= 30) {
        hclass = " ht-strong-pos-change";
    } else if (num > 0 && num < 30) {
        hclass = " ht-weak-pos-change";
    } else if (num < 0 && num > -20) {
        hclass = " ht-weak-neg-change";
    } else if (num <= -20) {
        hclass = " ht-strong-neg-change";
    }
    return hclass;
}

function getHighlightClass4Surprise(num, str) {
    let hclass = "";
    if (str === "N/A") {
        return hclass;
    }
    if (!isDefined(num)) {
        return hclass;
    }

    if (num >= 30) {
        hclass = " ht-strong-pos-surprise";
    } else if (num > 0 && num < 30) {
        hclass = " ht-weak-pos-surprise";
    } else if (num < 0 && num > -20) {
        hclass = " ht-weak-neg-change";
    } else if (num <= -20) {
        hclass = " ht-strong-neg-change";
    }
    return hclass;
}

function getParser(ds_type, html) {
    if (ds_type === 1) return new SAParser(html);
    else if (ds_type === 2) return new ZAParser(html);
    else return undefined;
}

// Classes
class Parser {
    constructor() {}
}

class SAParser extends Parser {
    constructor(html) {
        super();
        const parsedData = SAParser.parse(html);
        super.qtrData = parsedData[0];
        super.annualData = parsedData[1];
    }

    static parse(html = undefined) {
        const quarterlyData = [],
            annualData = [];
        const parser = new DOMParser();
        let dom = isDefined(html)
            ? parser.parseFromString(html, "text/html")
            : document;
        let dataBlockCount = 1;
        const monthYearRegex = /^[A-Za-z]{3} \d{4}/;
        const blocks = dom.querySelectorAll('[data-test-id="table-body"]');
        blocks.forEach((block) => {
            let rows = [];
            switch (dataBlockCount) {
                case 1:
                    break;
                case 2:
                    // eps estimates
                    rows = collectChildText(block);
                    for (const row of rows) {
                        if (
                            !isDefined(row[0]) ||
                            row[0] == "" ||
                            row[0].match(monthYearRegex) == null
                        )
                            continue;
                        let year = new Year(
                            getAnnualEstimateYear(row[0]),
                            "*" + getAnnualEstimateYear(row[0]),
                            row[1]
                        );
                        year.qtrs4Year = 4;
                        annualData.push(year);
                    }
                    break;
                case 3:
                    // revenue estimates
                    rows = collectChildText(block);
                    for (const row of rows) {
                        if (
                            !isDefined(row[0]) ||
                            row[0] == "" ||
                            row[0].match(monthYearRegex) == null
                        )
                            continue;
                        let yearInt = getAnnualEstimateYear(row[0]);
                        const foundYear = annualData.find(
                            (q) => q.year == yearInt
                        );
                        if (foundYear) {
                            foundYear.rev = revenueStringToFloat(row[1]);
                        } else {
                            let year = new Year(
                                yearInt,
                                "*" + yearInt,
                                undefined,
                                revenueStringToFloat(row[1])
                            );
                            annualData.push(year);
                        }
                    }
                    break;
                case 4:
                    // earnings data
                    rows = collectChildText(block);
                    for (const row of rows) {
                        if (
                            !isDefined(row[0]) ||
                            !isDefined(row[1]) ||
                            !isDefined(row[3]) ||
                            row[0] == "" ||
                            !row[0].includes("FQ")
                        )
                            continue;
                        let q = new SAQarter(row);
                        if (isQuarterValid(q)) {
                            quarterlyData.unshift(q);
                        }
                    }
                    break;
            }
            ++dataBlockCount;
        });
        return [quarterlyData, annualData];
    }
}

class ZAParser extends Parser {
    constructor(html) {
        super();
        const parsedData = ZAParser.parse(html);
        super.qtrData = parsedData[0];
        super.annualData = undefined;
    }

    static parse(html = undefined) {
        const quarterlyData = [],
            annualData = [];
        const parser = new DOMParser();
        let dom = isDefined(html)
            ? parser.parseFromString(html, "text/html")
            : document;
        let json = dom
            .querySelector("#earnings_announcements_tabs")
            .nextElementSibling.innerHTML.trim();
        json = json.substr(json.indexOf("{"));
        json = json.substr(0, json.lastIndexOf("}") + 1);
        let dataObj = JSON.parse(json);
        dataObj.earnings_announcements_earnings_table.forEach((item) => {
            let quarter = new ZAQarter(
                item[0],
                item[1],
                item[3],
                item[5],
                dataObj.earnings_announcements_sales_table
            );

            if (isQuarterValid(quarter)) {
                quarterlyData.unshift(quarter);
            }
        });
        return [quarterlyData, undefined];
    }
}

class Quarter {
    constructor() {}
}

class SAQarter extends Quarter {
    constructor(cells) {
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
        let qtr = {};
        let start = str.indexOf("(") + 1;
        qtr.name = str.substr(start, str.indexOf(")") - start);
        qtr.month = qtr.name.substr(0, 3);
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
        if (epsStr == "" || epsStr == "-") return undefined;
        eps.eps = parseFloat(epsStr);
        if (
            isDefined(surpriseStr) &&
            surpriseStr != "-" &&
            isDefined(eps.eps)
        ) {
            eps.surprisePerf = SAQarter.calculateSurprisePercent(
                parseFloat(surpriseStr),
                eps.eps
            );
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
        if (
            isDefined(surpriseStr) &&
            surpriseStr != "-" &&
            isDefined(rev.rev)
        ) {
            rev.surprisePerf = SAQarter.calculateSurprisePercent(
                SAQarter.revenueStringToFloat(surpriseStr),
                rev.rev
            );
        }

        return rev;
    }

    static calculateSurprisePercent(surprise, measure) {
        if (!isDefined(surprise) || !isDefined(measure)) {
            return undefined;
        }
        let projected = measure - surprise;
        let surprisePercent = calculatePercentChange(measure, projected);
        return surprisePercent;
    }

    static revenueStringToFloat(revStr) {
        revStr = revStr.trim();
        if (revStr == "" || revStr == "-") return undefined;
        if (revStr.endsWith("M")) {
            return parseFloat(parseFloat(revStr).toFixed(1));
        } else if (revStr.endsWith("K")) {
            return parseFloat((parseFloat(revStr) / 1000).toFixed(2));
        } else if (revStr.endsWith("B")) {
            return Math.round(parseFloat(revStr) * 1000);
        } else {
            return parseFloat((parseFloat(revStr) / 1000).toFixed(2));
        }
    }
}

class ZAQarter extends Quarter {
    constructor(dateStr, nameStr, epsStr, epsSurpriseStr, revData) {
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
        let parts = str.split("/");
        let month = parseInt(parts[0]);
        let year = parseInt(parts[1]);
        qtr.name = MONTH_MAP[month] + " " + year;
        qtr.month = MONTH_MAP[month];
        qtr.year = year;
        return qtr;
    }

    static parseQtrEps(epsStr, epsSurpriseStr) {
        let eps = {};
        eps.eps = parseFloat(epsStr.replace(/\$/, ""));

        if (isDefined(epsSurpriseStr) && epsSurpriseStr.indexOf(">") > -1) {
            epsSurpriseStr = epsSurpriseStr
                .substr(epsSurpriseStr.indexOf(">") + 1)
                .slice(0, -7);
            eps.surprisePerf = Math.round(parseFloat(epsSurpriseStr));
        }
        return eps;
    }

    static parseQtrRev(period, revData) {
        let rev = {};
        rev.rev = 0;
        // find corresponding period in revData
        revData.forEach(function (item) {
            if (item[1] == period) {
                rev.rev = parseFloat(item[3].replace(/[\$\,]/g, ""));
                // round to 1 decimal
                rev.rev = Math.round(rev.rev * 10) / 10;

                if (isDefined(item[5]) && item[5].indexOf(">") > -1) {
                    let revSurprise = item[5]
                        .substr(item[5].indexOf(">") + 1)
                        .slice(0, -7);
                    rev.surprisePerf = Math.round(parseFloat(revSurprise));
                }
            }
        });
        return rev;
    }
}

class Year {
    constructor(year, name, eps, rev) {
        this.year = year;
        this.name = name;
        this.eps = eps;
        this.rev = rev;
    }
}
