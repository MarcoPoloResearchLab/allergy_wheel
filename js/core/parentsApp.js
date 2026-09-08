// @ts-check
import { renderPrivacyDetails } from '../ui/privacy.js';
import { createFeedbackGateway } from './gateway.js';
import { loadParentFeedback, renderParentPanel } from '../ui/parentPanel.js';

renderParentPanel(createFeedbackGateway({ loadFeedback: loadParentFeedback }));
renderPrivacyDetails(document.querySelector('main'));
