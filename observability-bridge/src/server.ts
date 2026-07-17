import { createApp } from './app.js';
import { loadRuntimeConfig } from './config.js';

const runtime = loadRuntimeConfig();
const app = createApp(runtime);

app.listen(runtime.port, () => {
  console.log(`Observability bridge listening on port ${runtime.port}`);
});
