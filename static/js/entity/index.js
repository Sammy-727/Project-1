import { PageViewModule } from '../shared/PageViewModule.js';
import { PAGE_CONFIGS } from './configs.js';

document.querySelectorAll('[data-page-module]').forEach((root) => {
  const key = root.dataset.pageModule;
  const config = PAGE_CONFIGS[key];
  if (!config) {
    console.warn(`Unknown page module: ${key}`);
    return;
  }
  new PageViewModule(root, config);
});

// Legacy attribute support
document.querySelectorAll('[data-entity-module]:not([data-page-module])').forEach((root) => {
  const key = root.dataset.entityModule;
  const config = PAGE_CONFIGS[key];
  if (config) new PageViewModule(root, config);
});
