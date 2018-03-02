"use strict";

const fs = require('fs');
const sgMail = require('@sendgrid/mail');
const argv = require('yargs').argv;
const Promise = require('bluebird');
const csvParse = Promise.promisify(require('csv-parse'));
const config = require('./config')

function readCsv(file, callback) {
  let headerArray;
  const options = {
    trim: true,
    columns: function(header) {
      headerArray = header;
      console.log('header: ', header);
    }
  };

  return csvParse(file, options).then(function(rows) {
    const results = [];
    rows.forEach(function(row) {
      const obj = {};
      headerArray.forEach(function(name, i) {
        obj[name] = row[i];
      });
      results.push(obj);
    });
    return results;
  });
}

async function start() {
  let template;

  const key = process.env.SENDGRID_API_KEY || config.api_key;
  if (!key) {
    process.exit(1)
  }
  sgMail.setApiKey(key)

  if (argv._.length != 2) {
    console.error('Missing arguments: e.g.');
    console.error('  npm start -- template.html contacts.csv --substitutions subs.csv');
    return;
  }

  try {
    template = fs.readFileSync(argv._[0], 'utf8');
  } catch (err) {
    console.error('Template file does not exist: ', err);
    return;
  }

  let substitutions
  if (argv.substitutions) {
    try {
      substitutions = await csvParse(fs.readFileSync(argv.substitutions, 'utf8'), {trim: true})
    } catch(err) {
      throw err
    }
  }

  let contacts
  try {
    contacts = await readCsv(fs.readFileSync(argv._[1], 'utf8'))
  } catch(err) {
    throw err
  }
  console.log(contacts)

  console.log('Adding contacts...');
  const emails = contacts.map((c) => {
    const email = {
      from: {
        name: config.from.name,
        email: config.from.email,
      },
      subject: config.subject,
      html: template,
      to: c.email,
    }

    if (config.category) {
      email.categories = [config.category]
    }

    if (config.substitutionWrappers) {
      email.substitutionWrappers = config.substitutionWrappers
    }

    if (substitutions) {
      email.substitutions = []
      substitutions.forEach((s) => {
        let sub = {}
        sub[s] = c[s]
        email.substitutions.push(sub)
      })
    }
    return email
  })

  console.log('Sending emails...');

  for (let i = 0; i < emails.length; i++) {
    try {
      console.log(i + 1)
      await sgMail.send(emails[i])
    } catch(err) {
      console.error(err)
    }
  }
}

start()
  .then(() => {
    console.log('done')
  })
  .catch((err) => {
    console.error(err)
  })
