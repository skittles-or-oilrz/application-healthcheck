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

export default class WebServer {
  constructor(log) {
    this.log = log;
  }

  init() {
    this.log.info('Initialising Web Server');
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

        checkInterval = setInterval(() => {
          log.info('Running scheduled checks');
          (async () => {
            const scheduledResult = await runAllAssetChecks(log);
            io.emit('data', JSON.stringify(scheduledResult));
          })();
        }, 300000);

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
