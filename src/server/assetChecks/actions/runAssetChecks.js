import AssetFactory from '../../assets/classes/assetFactory.js';
import Config from 'config';
import { getAssetByIdFromArray, getAssetByNameFromArray } from '../../assets/actions/getAssets.js';
import { makeHttpRequest } from '../classes/websiteCheck.js';
import { makeWebServiceRequest } from '../classes/webServiceCheck.js';
import { makeServerRequest } from '../classes/serverCheck.js';

import logger from '../../common/logger.js';

async function runSingleCheck(checkToRun, log = logger) {
  if (!checkToRun || typeof checkToRun.getCheckType !== 'function') {
    return { error: 'Asset not found or invalid' };
  }

  const type = checkToRun.getCheckType();

  if (type === 'website') {
    return makeHttpRequest(checkToRun, log);
  }
  if (type === 'webservice') {
    return makeWebServiceRequest(checkToRun, log);
  }
  if (type === 'server') {
    return makeServerRequest(checkToRun, log);
  }

  return { error: `Unknown check type: ${type}` };
}

async function runAllAssetChecks(log = logger) {
  return runAllAssetChecksFromArray(Config.get('healthcheck.items'), log);
}

async function runAllAssetChecksFromArray(items, log = logger) {
  const AssetArray = AssetFactory.createAssetList(items);

  const promiseArray = AssetArray.map((item) => runSingleCheck(item, log));
  const results = await Promise.all(promiseArray);

  const time = Date.now();

  return {
    timestamp: time,
    items: results,
  };
}

async function runAssetCheckById(id, log = logger) {
  return runAssetCheckByIdFromArray(Config.get('healthcheck.items'), id, log);
}

async function runAssetCheckByIdFromArray(healthcheckItems, id, log = logger) {
  return runSingleCheck(getAssetByIdFromArray(healthcheckItems, id), log);
}

async function runAssetCheckByName(name, log = logger) {
  return runAssetCheckByNameFromArray(Config.get('healthcheck.items'), name, log);
}

async function runAssetCheckByNameFromArray(healthcheckItems, name, log = logger) {
  return runSingleCheck(getAssetByNameFromArray(healthcheckItems, name), log);
}

export {
  runSingleCheck,
  runAssetCheckById,
  runAssetCheckByName,
  runAllAssetChecks,
  runAssetCheckByIdFromArray,
  runAssetCheckByNameFromArray,
  runAllAssetChecksFromArray,
};
