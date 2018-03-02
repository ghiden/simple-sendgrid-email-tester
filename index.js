"use strict";

var fs = require('fs');
var sendgridAPI = require('sendgrid');
var argv = require('yargs').argv;
var Promise = require('bluebird');
var csvParse = Promise.promisify(require('csv-parse'));

function readCsv(file, callback) {
  var headerArray;
  var options = {
    trim: true,
    columns: function(header) {
      headerArray = header;
      console.log('header: ', header);
    }
  };

  return csvParse(file, options).then(function(rows) {
    var results = [];
    rows.forEach(function(row) {
      var obj = {};
      headerArray.forEach(function(name, i) {
        obj[name] = row[i];
      });
      results.push(obj);
    });
    return results;
  });
}

function addSubstitutions(email, contacts, substitutionsFile) {
  if (!substitutionsFile) {
    return Promise.resolve(contacts);
  }

  console.log('Add substitutions');
  return csvParse(fs.readFileSync(substitutionsFile, 'utf8'), {trim: true})
    .then(function(rows) {
      contacts.forEach(function(contact) {
        rows.forEach(function(row) {
          email.addSubstitution(row[0], contact[row[1]]);
        });
      });
      return contacts;
    });
}

function start() {
  var template;

  var config = JSON.parse(fs.readFileSync('./config.json'));
  var sendgrid
  if (process.env.SENDGRID_API_KEY) {
    console.log('key found')
    sendgrid = sendgridAPI(process.env.SENDGRID_API_KEY)
  } else if (!config.api_user) {
    sendgrid = sendgridAPI(config.api_key);
  } else {
    sendgrid = sendgridAPI(config.api_user, config.api_key);
  }

  if (argv._.length != 2) {
    console.error('Missing arguments: e.g.');
    console.error('  npm start -- template.html contacts.csv --substitutions subs.csv');
    return;
  }

  try {
    template = fs.readFileSync(argv._[0]);
  } catch (err) {
    console.error('Template file does not exist: ', err);
    return;
  }

  console.log('Starting...');

  var email = new sendgrid.Email({
    fromname: config.from_name,
    from: config.from,
    subject: config.subject,
    html: template
  });

  if (config.category) {
    email.addCategory(config.category);
  }

  readCsv(fs.readFileSync(argv._[1], 'utf8'))
    .then(function(contacts) {
      return addSubstitutions(email, contacts, argv.substitutions);
    })
    .then(function(contacts) {
      console.log('Adding contacts...');
      contacts.forEach(function(address, i) {
        email.addTo(address.email);
      });

      console.log('Sending emails...');
      sendgrid.send(email, function(err, json) {
        if (err) {
          console.error('error: ', err);
        } else {
          console.log('success: ', json);
        }
      });
    })
    .catch(function(err) {
      console.error(err);
    });
}

start();
