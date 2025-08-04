import { runAllAssetChecks } from './assetChecks/actions/runAssetChecks.js';
import httpshutdown from 'http-shutdown';

import config from 'config';
import os from 'os';
import express from 'express';
import apiRoutes from './routes/apiRoutes.js';
import path from 'path';
import settings from '../../settings.js';
import { Server as ioSockets } from 'socket.io';
import * as http from 'http';

const app = express();
const appPort = process.env.PORT || config.get('healthcheck.options.port');

let server;
let state = 'Shutdown';
let io;
let checkInterval;

function validateConfig(log) {
  const items = config.get('healthcheck.items') || [];
  const required = ['key', 'name', 'checkType', 'url'];
  let invalid = 0;

  items.forEach((item, idx) => {
    const missing = required.filter((k) => item[k] === undefined || item[k] === null || item[k] === '');
    if (missing.length) {
      invalid += 1;
      log.error(`Config item[${idx}] missing required fields: ${missing.join(', ')}`);
    }
  });

  if (invalid) {
    log.warn(`${invalid} invalid config item(s) detected. They may fail at check time.`);
  } else {
    log.info('Config validation passed.');
  }
}

export default class WebServer {
  constructor(log) {
    this.log = log;
  }

  init() {
    this.log.info('Initialising Web Server');
    validateConfig(this.log);
  }

  start() {
    const log = this.log;

    return new Promise((resolve, reject) => {
      app.use('/', express.static(path.join(settings.PROJECT_DIR, 'dist')));

      app.get('/', (req, res) => {
        res.sendFile('index.html', { root: path.join(settings.PROJECT_DIR, 'dist') });
      });

      app.use('/api', apiRoutes);

      const httpServer = http.createServer(app);
      server = httpshutdown(httpServer);

      server.listen(appPort, () => {
        log.info(`Healthcheck App Started. Live at http://${os.hostname()}:${appPort}.`);
        log.info(`Get list of items to monitor. http://${os.hostname()}:${appPort}/api/components/list.`);
        log.info(`Run the monitor. http://${os.hostname()}:${appPort}/api/runMonitor.`);

        state = 'Started';

        io = new ioSockets(server);

        io.on('connection', (socket) => {
          log.info('Received socket connection.');
          socket.emit('message', 'You are connected!');
          socket.broadcast.emit('message', 'Another client has just connected!');
        });

        const intervalMs = config.get('healthcheck.options.checkIntervalMs') || 300000;

        checkInterval = setInterval(async () => {
          log.info('Running scheduled checks');
          try {
            const scheduledResult = await runAllAssetChecks(log);
            io.emit('data', JSON.stringify(scheduledResult));
          } catch (err) {
            log.error(`Scheduled check failed: ${err.message || err}`);
          }
        }, intervalMs);

        resolve();
      }).on('error', (e) => {
        log.info(e);
        reject(e);
      });
    });
  }

  shutdown() {
    const log = this.log;

    return new Promise((resolve) => {
      state = 'Shutting down';
      log.info('Shutting down.');

      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }

      if (io) {
        io.close();
      }

      if (server) {
        server.shutdown(() => {
          state = 'Shutdown';
          resolve();
        });
      } else {
        state = 'Shutdown';
        resolve();
      }
    });
  }

  getApiRoot() {
    return `http://${os.hostname()}:${appPort}/api`;
  }

  getState() {
    return state;
  }
}
