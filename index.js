const express = require('express');
const { 
  Issuer,
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

const init = async () => {
  const issuer = await Issuer.discover(OIDC_DISCOVER_URL);

  const clientOptions = {
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uris: [
      `${EXTERNAL_URL_OPENID_CLIENT}/callback`,
    ],
    response_types: ['code'],
    grant_types: ['authorization_code', 'refresh_token'],
  };

  const client = (
    CLIENT_REGISTRATION_TOKEN
    ? await issuer.Client.register({...issuer.metadata, ...clientOptions}, {initialAccessToken: CLIENT_REGISTRATION_TOKEN})
    : new issuer.Client({
        ...clientOptions,   
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      })
  );

  app.get('/', (req, res) => res.redirect(client.authorizationUrl()));


  app.get('/callback',
    async (req, res) => {
      const params = client.callbackParams(req);

      const tokenSet = await client.callback(`${EXTERNAL_URL_OPENID_CLIENT}/callback`, params, { code_verifier });
      const userinfo = await client.userinfo(tokenSet);

      const data = {
        tokenSet,
        claims: { ...tokenSet.claims() },
        userinfo: { ...userinfo },
      };
      res.send(`success: ${data}`);
    }
  );
};

init();
