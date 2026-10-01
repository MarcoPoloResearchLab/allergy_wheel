// @ts-check
import { createAnalyticsGateway } from './gateway.js';

const gateway = createAnalyticsGateway();
document.documentElement.dataset.analyticsState = 'loading';
gateway.enableAnalytics().then(
    () => { document.documentElement.dataset.analyticsState = 'ready'; },
    () => { document.documentElement.dataset.analyticsState = 'unavailable'; }
);
