// @ts-check
import { createAnalyticsGateway } from './gateway.js';
import { loadExternalScript } from '../ui/externalResources.js';

const gateway = createAnalyticsGateway({ loadScript: loadExternalScript });
document.documentElement.dataset.analyticsState = 'loading';
gateway.enableAnalytics().then(
    () => { document.documentElement.dataset.analyticsState = 'ready'; },
    () => { document.documentElement.dataset.analyticsState = 'unavailable'; }
);
