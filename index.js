var fs = require('fs');
var path = require('path');
var sendgridAPI = require('sendgrid');
var argv = require('yargs').argv;

function start() {
  console.log('starting...');

  var config = JSON.parse(fs.readFileSync('./config.json'));
  var sendgrid = sendgridAPI(config.api_user, config.api_key);
  if (!argv.template) {
    console.error('Missing a template file: e.g.');
    console.error('  npm start -- --template template.html');
    return;
  }

  var smtpapi = new sendgrid.smtpapi();
  smtpapi.header.to = config.to
  var payload = {
    fromname: config.from_name,
    from: config.from,
    subject: config.subject,
    html: fs.readFileSync(argv.template),
    smtpapi: smtpapi
  };

  console.log('sending emails...');
  sendgrid.send(payload, function(err, json) {
    if (err) {
      console.error('error: ', err);
    } else {
      console.log('success: ', json);
    }
  });
}

start();
