//const rp = require('request-promise');
import rp from 'request-promise';
import resultsLogger from '../../common/resultsLogger.js';

async function makeWebServiceRequest(requestObj, log) {

  const options = {
    uri: requestObj.url,
    headers: requestObj.headers,
    timeout: 10000,
    resolveWithFullResponse: true,
    method: requestObj.method,
    body: requestObj.payload,
  };

  const start = Date.now();

  try {

    log.info(`Running WebService check ${requestObj.name}.`);
    const responseObject = await rp(options);
    const end = Date.now() - start;

    requestObj.setActualResponseCode(responseObject.statusCode);
    requestObj.setActualResponseTime(end);
    requestObj.setTimestamp(Date.now());

    log.info(requestObj.getResponseSummaryMessage());
    resultsLogger.info(JSON.stringify(requestObj.toJson()));

    return requestObj;

  } catch (error) {
    const end = Date.now() - start;

    requestObj.setActualResponseCode(error.statusCode || error.message);
    requestObj.setActualResponseTime(end);
    requestObj.setTimestamp(Date.now());

    log.error(`Error - ${requestObj.getResponseSummaryMessage()}`);
    resultsLogger.info(JSON.stringify(requestObj.toJson()));

    return requestObj;
  }


}

export { makeWebServiceRequest }
