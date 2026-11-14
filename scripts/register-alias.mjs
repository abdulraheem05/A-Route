// Registers the "@/..." resolver for scripts run with
//   node --import ./scripts/register-alias.mjs <script>
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register(pathToFileURL(new URL('./alias-loader.mjs', import.meta.url).pathname));
