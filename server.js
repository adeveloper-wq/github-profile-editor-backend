const express = require("express");
const axios = require('axios');
const cookieParser = require('cookie-parser');
const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
var cloudinary = require('cloudinary').v2
var cors = require('cors')
require('dotenv').config();

const BASE_URL_SERVER = process.env.BASE_URL_SERVER
const BASE_URL_CLIENT = process.env.BASE_URL_CLIENT
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URL_SERVER = BASE_URL_SERVER + '/callback';
const REDIRECT_URL_CLIENT = BASE_URL_CLIENT + '/editor';
const stateKey = 'github_auth_state';

/* cloudinary.config({
  cloud_name: ,
  api_key: ,
  api_secret: 
}); */

const app = express();
app.use(cookieParser());

app.use(cors())

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
var generateRandomString = function (length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

// Declare the callback route
app.get('/callback', (req, res) => {

  // The req.query object has the query params that were sent to this route.
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect(BASE_URL_CLIENT + "?" + new URLSearchParams({ error: 'state_mismatch' }));
  } else {
    res.clearCookie(stateKey);

    const body = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code
    };
    const opts = { headers: { accept: 'application/json' } };
    axios.post(`https://github.com/login/oauth/access_token`, body, opts).
      then(res2 => {
        var access_token = res2.data.access_token;
        res.redirect(REDIRECT_URL_CLIENT + '?' +
          new URLSearchParams({
            access_token: access_token
          }));
      }).
      catch(err => {
        res.redirect(BASE_URL_CLIENT + '?' +
          new URLSearchParams({
            error: err.message
          }));
      });
  }
});

app.get('/authenticate', function (req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'repo:status read:user repo user:email';
  res.redirect('https://github.com/login/oauth/authorize?' +
    new URLSearchParams({
      client_id: CLIENT_ID,
      scope: scope,
      redirect_uri: REDIRECT_URL_SERVER,
      state: state
    }));
})

app.get('/image', function (req, res) {
  const data = JSON.parse(req.query.data);
  const width = 400;
  const height = 400; //px

  const backgroundColour = 'transparent'; // Uses https://www.w3schools.com/tags/canvas_fillstyle.asp
  const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour });
  (async () => {
    const configuration = data;
    //const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    const dataUrl = await chartJSNodeCanvas.renderToDataURL(configuration);
    //onst stream = chartJSNodeCanvas.renderToStream(configuration); 
    return res.send(dataUrl);
    /* let filename = Math.random().toString(16).slice(2);
    let path = "charts/" + filename;
    await cloudinary.uploader.upload(dataUrl,
      {
        resource_type: "image", public_id: path,
        overwrite: true
      },
      function (error, result) {
        if(error === undefined){
          return res.send({publicUrl: result.secure_url, base64: dataUrl});
        }else{
          return res.send(undefined);
        }
      }); */

    

    //res.send("/tmp/" + filename);
  })();

})

/* app.get('/user', async function (req, res) {
  const access_token = req.get('authorization');

  const octokit = new Octokit({
    auth: access_token,
  });

  const { data } = await octokit.request("/user");
  console.log(data);
}) */

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});