'use strict';
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

class Utils {

  static list_to_tree(list) {
    var map = {}, node, roots = [], i;
    for (i = 0; i < list.length; i += 1) {
      map[list[i].id] = i; // initialize the map
      list[i].children = []; // initialize the children
    }
    for (i = 0; i < list.length; i += 1) {
      node = list[i];
      if (node.parentId !== "0") {
        // if you have dangling branches check that map[node.parentId] exists
        list[map[node.parentId]].children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  /* Used to validate all id based API calls */
  static validateId (id, res, route) {
    var error = route + ' ID is missing';
    try {
      if (!id || isNaN(parseInt(id))) {
        res.status(400).send({ error: error });
        return true;
      }
    } catch (error) {
      res.status(400).send({ error: error });
      return true;
    }
  }

  /* mail helper*/
  static mailHelper () {
    return nodemailer.createTransport(smtpTransport({
       host: process.env.EMAIL_HOST,
       port: parseInt(process.env.EMAIL_PORT),
       secureConnection: false,
       debug: true,
       tls: {
          rejectUnauthorized: false
        },
       auth: {
         user: process.env.EMAIL_USER,
         pass: process.env.EMAIL_PASS
       }
     }));
  }

  /* to return mimetype of base64 encoded string */
  static base64MimeType(encoded) {
    var result = null;

    if (typeof encoded !== 'string') {
      return result;
    }

    var mime = encoded.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);

    if (mime && mime.length) {
      result = mime[1];
    }

    return result;
  }

  /* Update logs*/
  static eventLoger (feature, action, user ) {
    const EventLogs = require('../../models').EventLogs;
    const data = {
      feature: feature,
      action: action,
      userBy: user
    };
    EventLogs.create(data)
    .then((log) => {
      let logData = log.get();
    })
    .catch((err) => {
      console.error('err', err);
    });
  }

}

module.exports = Utils;
