# Frequently Asked Questions

### Are updates automatic?
* No, unfortunately, you have to update manually each time. Download the [ZIP file](https://github.com/huskytrader/corporate-earnings/archive/main.zip) and unzip it into the previous location overwriting old files.

### Changing data thresholds and colors
* You can change a few variables that control presentation. They are located on top of [src/js/content.js](https://github.com/huskytrader/corporate-earnings/tree/main/src/js/content.js) file
```javascript
const CHANGE_POSITIVE_COLOR = '#0000FF';
const CHANGE_NEGATIVE_COLOR = '#FF0000';
const SURPRISE_POSITIVE_COLOR = '#04C90A';

const LOW_ADR_THRESHOLD = 4.5;
const LOW_ADR_COLOR = '#FF0000';

const HIGH_SHORT_INTEREST_THRESHOLD = 20;
const HIGH_SHORT_INTEREST_COLOR = '#FF0000';

const DAYS_BEFORE_EARNINGS_WARN_THRESHOLD = 3;
const DAYS_BEFORE_EARNINGS_WARN_COLOR = '#FF0000';

const HIGH_INST_CHANGE_THRESHOLD = 10;
const HIGH_INST_CHANGE_COLOR = '#00FF00';
``` 

### Adding more features/data points
* I am open to suggestions
