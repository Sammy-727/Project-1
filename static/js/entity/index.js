import { EntityListModule } from '../shared/EntityListModule.js';
import { ENTITY_CONFIGS } from './configs.js';

document.querySelectorAll('[data-entity-module]').forEach((root) => {
  const key = root.dataset.entityModule;
  const config = ENTITY_CONFIGS[key];
  if (!config) {
    console.warn(`Unknown entity module: ${key}`);
    return;
  }
  new EntityListModule(root, config);
});
