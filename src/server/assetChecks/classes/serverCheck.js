import net from 'net';
import resultsLogger from '../../common/resultsLogger.js';

/**
 * TCP connect check (no CAP_NET_RAW required).
 * Treats successful connection as 200, failure as 500.
 */
async function makeServerRequest(requestObj, log) {
  const start = Date.now();
  const timeoutMs = 2500;

  return new Promise((resolve) => {
    if (!requestObj.url || requestObj.url.length === 0) {
      requestObj.setActualResponseCode('No URL');
      requestObj.setActualResponseTime(0);
      requestObj.setTimestamp(Date.now());
      log.error(`Error - ${requestObj.getResponseSummaryMessage()}`);
      resultsLogger.info(JSON.stringify(requestObj.toJson()));
      return resolve(requestObj);
    }

    // Default to port 80 if none provided; accept host or host:port
    let host = requestObj.url;
    let port = 80;
    if (host.includes(':')) {
      const parts = host.split(':');
      host = parts[0];
      port = parseInt(parts[1], 10) || 80;
    }

    const socket = new net.Socket();
    let settled = false;

    const finish = (code, time) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      requestObj.setActualResponseCode(code);
      requestObj.setActualResponseTime(time);
      requestObj.setTimestamp(Date.now());
      log.info(requestObj.getResponseSummaryMessage());
      resultsLogger.info(JSON.stringify(requestObj.toJson()));
      resolve(requestObj);
    };

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      finish(200, Date.now() - start);
    });

    socket.on('timeout', () => {
      finish(500, Date.now() - start);
    });

    socket.on('error', (err) => {
      log.error(`Server check error for ${requestObj.name}: ${err.message}`);
      finish(500, Date.now() - start);
    });

    socket.connect(port, host);
  });
}

export { makeServerRequest };
