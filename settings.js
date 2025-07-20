import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const settings = {
  PROJECT_DIR: path.resolve(__dirname),
};

export default settings;
