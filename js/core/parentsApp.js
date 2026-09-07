// @ts-check
import { renderPrivacyInformation } from '../ui/privacy.js';
import { createParentGateway } from './gateway.js';
import { loadParentScript, loadParentStylesheet, renderParentPanel } from '../ui/parentPanel.js';

renderPrivacyInformation(document.querySelector('main'));
renderParentPanel(createParentGateway({ loadScript: loadParentScript, loadStylesheet: loadParentStylesheet }));
