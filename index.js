#!/usr/bin/env node
const express = require('express');
const { 
  Issuer,
  generators,
} = require('openid-client');

const app = express();

const {
  CLIENT_PORT = 3001,
  PROVIDER_PORT = 3000,
  OIDC_DISCOVER_URL = `http://localhost:${PROVIDER_PORT}`,
  CLIENT_ID,
  CLIENT_SECRET,
  CLIENT_REGISTRATION_TOKEN = 'abc123jklfs',
  EXTERNAL_URL_OPENID_CLIENT = `http://localhost:${CLIENT_PORT}`,
} = process.env;  

const clientOptions = {
  client_id: CLIENT_ID,
  client_secret: CLIENT_SECRET,
  redirect_uris: [
    `${EXTERNAL_URL_OPENID_CLIENT}/callback`,
  ],
  response_types: ['code'],
  grant_types: ['authorization_code', 'refresh_token'],
};

const init = async () => {
  const issuer = await Issuer.discover(OIDC_DISCOVER_URL);

  const client = (
    CLIENT_REGISTRATION_TOKEN
    ? await issuer.Client.register({...issuer.metadata, ...clientOptions}, {initialAccessToken: CLIENT_REGISTRATION_TOKEN})
    : new issuer.Client({
        ...clientOptions,   
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      })
  );
  app.get('/regtest', async (req, res) => {
    const { got } = await import('got');
    const {
      registration_client_uri,
      registration_access_token,
    } = client;
    try {
      const result = await got(registration_client_uri, {
        headers: { Authorization: `Bearer ${registration_access_token}`, },
      });
      1+result;
    } catch(e) {
      1+e;
    }
  });
  const isClientValid = async () => {
    try {
      const tokenSet = await client.callback(`${EXTERNAL_URL_OPENID_CLIENT}/callback`, {code:123});
    } catch(e) {
      if (e.error == 'invalid_client') {
        return false;
      } else {
        return true;
      }
    }
  }
  app.get('/cbtest', async (req, res) => {
    res.send(await isClientValid());
  });
    


  app.get('/', async (req, res) => {
    const code_verifier = generators.codeVerifier();
    const authorizationURL = client.authorizationUrl({
      code_challenge: generators.codeChallenge(code_verifier),
      code_challenge_method: 'S256',
      state: code_verifier,
    });
    res.redirect(authorizationURL)
  });

  app.get('/callback', async (req, res) => {
    try {
      const { state: code_verifier, ...params } = client.callbackParams(req);

      const tokenSet = await client.callback(`${EXTERNAL_URL_OPENID_CLIENT}/callback`, params, { code_verifier });
      const userinfo = await client.userinfo(tokenSet);

      const data = {
        tokenSet,
        claims: { ...tokenSet.claims() },
        userinfo: { ...userinfo },
      };
      res.send(`<p id="success">Success:</p> <pre>${JSON.stringify(data, ' ', 2)}</pre>`);
    } catch (e) {
      res.status(500).send(`Failure: ${e.message}`);
    }
  });

  app.listen(CLIENT_PORT);
};

init();
