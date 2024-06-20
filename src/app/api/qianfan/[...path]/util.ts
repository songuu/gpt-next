import CryptoJS from 'crypto-js';

import { getServerSideConfig } from "@/config/server";

const HOST = ''

function getTimestampString() {
  return new Date().toISOString().replace(/\.\d+/, '');
}

function getQueryString(params: any) {
  let queryString = '';
  let paramKeyArray: any = [];

  if (params) {
    for (let key in params) {
      paramKeyArray.push(key);
    }

    paramKeyArray = paramKeyArray.sort()
  }

  if (paramKeyArray && paramKeyArray.length) {
    for (let key of paramKeyArray) {
      queryString += encodeURIComponent(key) + '=' + encodeURIComponent(params[key]) + '&';
    }

    queryString = queryString.substr(0, queryString.length - 1)
  }

  return queryString;
}

function getAuthString(CanonicalURI: string, CanonicalQueryString: string, timestamp: string) {
  const serverConfig = getServerSideConfig();

  const accessKey = serverConfig.qianfanAccess;

  const expirationPeriodInSeconds = 120;

  let authStringPrefix = `bce-auth-v1/${accessKey}/${timestamp}/${expirationPeriodInSeconds}`

  let signedHeaders = 'host;x-bce-date';

  let canonicalHeaders = encodeURIComponent('host') + ':' + encodeURIComponent(HOST) + '\n' + encodeURIComponent('x-bce-date') + ':' + encodeURIComponent(timestamp);

  let Method = 'POST';

  const canonicalRequest = Method + '\n' + CanonicalURI + '\n' + CanonicalQueryString + '\n' + canonicalHeaders;

  // const signatureSha = CryptoJS.HmacSHA256(signatureOrigin, this.configs.sparkSecret);
  // const signature = CryptoJS.enc.Base64.stringify(signatureSha);
  const signingKey = CryptoJS.HmacSHA256(authStringPrefix, accessKey)
  //crypto.createHmac('sha256', accessKey).update(authStringPrefix).digest().toString('hex');

  const signature = CryptoJS.enc.Hex.stringify(signingKey)
  // crypto.createHmac('sha256', signingKey).update(canonicalRequest).digest().toString('hex');

  return `${authStringPrefix}/${signedHeaders}/${signature}`;
}

export {
  getTimestampString,
  getQueryString,
  getAuthString
}