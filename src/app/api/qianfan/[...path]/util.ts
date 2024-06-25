import CryptoJS from 'crypto-js';

import { getServerSideConfig } from "@/config/server";

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

function getAuthString(CanonicalURI: string, CanonicalQueryString: string, timestamp: string, host: string = "localhost:3000") {
  const serverConfig = getServerSideConfig();

  const accessKey = serverConfig.qianfanAccess;

  const expirationPeriodInSeconds = 1800;

  let authStringPrefix = `bce-auth-v1/${accessKey}/${timestamp}/${expirationPeriodInSeconds}`

  let signedHeaders = 'host;x-bce-date';

  let canonicalHeaders = encodeURIComponent('host') + ':' + encodeURIComponent(host) + '\n' + encodeURIComponent('x-bce-date') + ':' + encodeURIComponent(timestamp);

  const Method = 'POST';

  const canonicalRequest = Method + '\n' + CanonicalURI + '\n' + canonicalHeaders;

  console.log("canonicalRequest", canonicalRequest)
  console.log("authStringPrefix", authStringPrefix)

  const signingKey = CryptoJS.HmacSHA256(accessKey, authStringPrefix)

  const signingKeyToHex = signingKey.toString(CryptoJS.enc.Hex);
  // CryptoJS.enc.Hex.stringify(signingKey)

  console.log("signingKeyToHex", signingKeyToHex)
  //crypto.createHmac('sha256', accessKey).update(authStringPrefix).digest().toString('hex');

  const signature = CryptoJS.HmacSHA256(signingKeyToHex, canonicalRequest)

  const signatureToHex = CryptoJS.enc.Hex.stringify(signature)

  console.log("signatureToHex", signatureToHex)
  // CryptoJS.enc.Hex.stringify(signingKey)
  // crypto.createHmac('sha256', signingKey).update(canonicalRequest).digest().toString('hex');

  const uu = `${authStringPrefix}/${signedHeaders}/${signatureToHex}`;

  console.log("uuuuuu=>", uu)
  return uu;
}

export {
  getTimestampString,
  getQueryString,
  getAuthString
}