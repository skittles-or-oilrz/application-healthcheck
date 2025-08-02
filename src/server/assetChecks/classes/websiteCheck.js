import axios from 'axios';
import resultsLogger from '../../common/resultsLogger.js';

async function makeHttpRequest(requestObj, log) {
  const start = Date.now();

  try {
    log.info(`Running Website check ${requestObj.name}.`);

    const response = await axios({
      url: requestObj.url,
      method: 'GET',
      timeout: 10000,
      validateStatus: () => true,
    });

    const end = Date.now() - start;

    requestObj.setActualResponseCode(response.status);
    requestObj.setActualResponseTime(end);
    requestObj.setTimestamp(Date.now());

    log.info(requestObj.getResponseSummaryMessage());
    resultsLogger.info(JSON.stringify(requestObj.toJson()));

    return requestObj;
  } catch (error) {
    const end = Date.now() - start;

    requestObj.setActualResponseCode(error.response?.status || error.message);
    requestObj.setActualResponseTime(end);
    requestObj.setTimestamp(Date.now());

    log.error(`Error - ${requestObj.getResponseSummaryMessage()}`);
    resultsLogger.info(JSON.stringify(requestObj.toJson()));

    return requestObj;
  }
}

export { makeHttpRequest };
