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

const CSS = (showChart = false, show_earnings_surprise = false) => `
<style>
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
        border-collapse: collapse;
    }
    #ht-root-container td {
        font-weight: 400;
        line-height: 1.5;
        font-family: sans-serif;
    }
    table#ht-fundamentals-container {
       border: 1px solid #c9c9bb;
       border-collapse: collapse;
       margin: 0px 0px 5px 0px;
       box-shadow: 0 0 20px rgba(0, 0, 0, 0.15);
       display: none;
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

const HTML_EARNINGS_ONLY = `
        <div id="ht-root-container" style="width: 100%; border: 0;">
            <div id="ht-earnings-yearly">
            </div>
            <div id="ht-earnings-quarterly">
            </div>
        </div>
        `;

const HTML = (showChart = null) => `
        <div id="ht-root-container">
            <table id="ht-fundamentals-container">
                <tr>
                    <td colspan="3" id="ht-company"></td>
                    <td title="Price / Volume" id="ht-pricevol"></td>
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
