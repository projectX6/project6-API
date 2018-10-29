'use strict';
const router = require('express').Router();
const Users = require('../../models').Users;
const Permissions = require('../../models').Permissions;
const Roles = require('../../models').Roles;
const countries = require('../../models').countries;
const utils = require('./utils');
const jsonWebToken = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
const EmailTemplate = require('email-templates').EmailTemplate
// To get email templates

var templatesDir = path.resolve(__dirname, '../..', 'templates');
var resetTemplate = new EmailTemplate(path.join(templatesDir, 'reset'));

// A base class is defined for unauth routing
class Auth {

  // an (optional) custom class constructor.
  constructor (app) {
    // app assigned to this.app
    this.app = app;
  }

  // Generate token for current user
  generateToken (req, res, next, userData) {
    //removing password from accessToken parent object
    delete userData['password'];
    // Generate the token when username and pasword matching
    var accessToken = jsonWebToken.sign(userData, this.app.get('jwtSecret'), {
      //Set the expiration
      expiresIn: 60000000 //we are setting the expiration time of 100000 mins. (seconds)
    });
    //send the response to the caller with the accesstoken and data
    console.log('Authentication is done successfully. ' + userData.email);
    res.json({
      authsuccess: true,
      message: 'Sending the Access Token',
      accessToken: accessToken,
      userinfo: userData
    });
  }

  // Login method
  login (req, res, next) {
    try {
      if (!req.body.email || !req.body.password) {
        return res.status(400).json({
          authsuccess: false,
          error: 'Invalid password'
        });
      }
      //To fetch current user based on credentials
      Users.findOne({
        where: {
          email: req.body.email,
          isActive: 1
        },
        include: [
          {
            model: Roles, as: 'Roles',
            include: [
              {
                model: Permissions,
                as: 'rolesHasPermissions'
              }
            ],
          },
          {
            model: countries,
            as: 'usersHasCountries'
          }
        ]
      })
      .then(user => {
        console.log(user);
        // To check if the user exist
        if (!user) {
          console.error('in error - user not found');
          res.status(401).json({
            authsuccess: false,
            error: 'Invalid user/password'
          });
        } else {
          // To check if the received password matches with the data user
          // Salt and hash password
          if (bcrypt.compareSync(req.body.password, user.password)) {
          // if (bcrypt.compareSync(req.body.password, user.password)) {
            let userData = user.get();
            console.log(userData);
            if(!userData.Roles.isTranslator) {
              userData.usersHasCountries = undefined;
            }
            // generates token for current user
            this.generateToken(req, res, next, userData);
          } else {
            res.status(401).json({
              authsuccess: false,
              error: 'Login failed'
            });
          }
        }
      })
      .catch(error => {
        console.error('error', error);
        res.status(400).send(error);
      });
    }
    catch(err) {
      let error = { 'error': 'Login Failed', 'details': err };
      console.error('error', error);
      res.status(400).send(error);
    }
  }

  // resetPassword method
  resetPassword (req, res, next) {
    console.log('resetPassword');
    if (req.body.email) {
      Users.findOne({
        where: {
          email: req.body.email,
          isActive: 1
        }
      })
      .then(user => {
        if (user) {
          let notExpired = false;

        //   if(user.resetRequestedOn && user.resetToken)
        //     // To increase passwordreset expiration to 48 hours
        //     notExpired = new Date() - new Date(user.resetRequestedOn) < 172800000
        //   // To check if the user exist
        //   console.log('notExpired, user.resetRequestedOn, user.resetToke', notExpired, user.resetRequestedOn, user.resetToken);
        //   if (notExpired) {
        //     var transporter = utils.mailHelper();
        //     var redirectLink = req.headers.origin + '/reset/' + user.resetToken;
        //
        //     var locals = {
        //       link: redirectLink
        //     };
        //     // setup e-mail data with unicode symbols
        //     resetTemplate.render(locals, function (err, results) {
        //       if (err) {
        //         return console.error(err);
        //       }
        //       var mailOptions = {
        //         from: process.env.EMAIL_FROM || 'noreply@dermalogica.com',// sender address
        //         to: ['mailmehema91@gmail.com', 'raju.pothana@mobigesture.com', req.body.email],
        //         subject: 'PIM: Reset Password', // Subject line
        //         html: results.html
        //       };
        //
        //       // send mail with defined transport object
        //       transporter.sendMail(mailOptions, function(error, info) {
        //         if (error) {
        //           return res.status(400).send({
        //             "error": error.message
        //           })
        //         }
        //         return res.send({
        //           "exist": true,
        //           "message": "An email will be sent to your Email address that includes a password reset link. Please check your email right away, as the link expires after 48 hours."
        //         })
        //       });
        //     })
        //
        // } else {
          console.log('req.body.email', req.body.email);
          const updateParams = {
            resetToken : bcrypt.hashSync(Date.now() + req.body.email, 10).replace(/[./$]/g, ''),
            resetPassword: 1,
            resetRequestedOn: new Date()
          }
          Users.update(updateParams,
          {
            where: {
              email: req.body.email
            }
          })
          .then((row) => {
            var transporter = utils.mailHelper();
            var redirectLink = req.headers.origin + '/#/reset/' + updateParams.resetToken;

            var locals = {
              link: redirectLink
            };
            // setup e-mail data with unicode symbols
            resetTemplate.render(locals, function (err, results) {
              if (err) {
                return console.error(err);
              }
              var mailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@dermalogica.com',// sender address
                to: [req.body.email],
                subject: 'PIM: Reset Password', // Subject line
                html: results.html
              };

              // send mail with defined transport object
              transporter.sendMail(mailOptions, function(error, info) {
                if (error) {
                  return res.status(400).send({
                    "error": error.message
                  })
                }
                return res.send({
                  "message": "An email will be sent to your Email address that includes a password reset link. Please check your email right away, as the link expires after 48 hours."
                })
              });
            })
          });
        //  }
        } else {
          res.status(401).json({
            authsuccess: false,
            error: 'Invalid email'
          });
        }
      });
    } else {
      return res.status(400).json({
        error: 'Invalid credentials'
      });
    }
  }

  // resetPassword method
  changePassword (req, res, next) {
    if (req.body.email && req.body.password && req.params.id) {
      Users.findOne({
        where: {
          // reset mail id validations
          email: req.body.email,
          // reset password validation
          resetPassword: 1,
          // Token validations
          resetToken: req.params.id,
          isActive: 1
        }
      })
      .then(user => {
        if (user && user.resetRequestedOn) {
          // Checking wether the link expired or available
          // let notExpired = new Date() - new Date(user.resetRequestedOn) < 86400000
          // To increase passwordreset expiration to 48 hours
          let notExpired = new Date() - new Date(user.resetRequestedOn) < 172800000
          // To check if the user exist
          if (notExpired) {
            // Salt and hash password
            let encryptedPassword = bcrypt.hashSync(req.body.password, 10);
            let updateParams = {
              'password': encryptedPassword,
              // 'resetToken': null,
              'resetPassword': 0,
              // 'resetRequestedOn': null
            };
            Users.update(updateParams,
            {
              where: {
                email: req.body.email
              }
            })
            .then((row) => {
              return res.send({
                "message": "Your password changed successfully"
              })
            });
          } else {
            if (!notExpired) {
              res.status(401).json({
                authsuccess: false,
                error: 'Your reset link expired after 48 hours or has already been used'
              });
            } else {
              res.status(401).json({
                authsuccess: false,
                error: 'Invalid credentials'
              });
            }
          }
        } else {
          res.status(401).json({
            authsuccess: false,
            error: 'Your reset link expired after 48 hours or has already been used'
          });
        }
      });
    } else {
      return res.status(400).json({
        authsuccess: false,
        error: 'Invalid credentials'
      });
    }
  }
}

module.exports = (app) => {

  // Classes are used just like ES5 constructor functions:
  let auth = new Auth(app);

  // POST /login gets urlencoded bodies
  // Login API
/**
 * @api {post} /api/v1/login Login
 * @apiSampleRequest  https://dev-pim-api.dermalogica.com/api/v1/login
 * @apiName Login
 * @apiGroup Authentication
 *
 * @apiDescription To do login
 *
 * @apiPermission Authorized user only
 *
 * @apiHeader {String} API-Key  application unique api-key
 *
 * @apiParam {String} email email of the user
 * @apiParam {String} password password of the user
 *
 * @apiSuccess {Number} id  Unique id of the user.
 * @apiSuccess {Object} userinfo  User information.
 * @apiSuccess {String} accessToken  accessToken of login.
 * @apiSuccess {String} message  login message.
 * @apiSuccess {Boolean} authsuccess  true/false based on success.
 *
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 200 OK
 *    {
 *        "authsuccess": true,
 *        "message": "Sending the Access Token",
 *        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NCwiZmlyc3RuYW1lIjoiSGVtYWt1bWFyIiwibGFzdG5hbWUiOiJtdWRpbWkiLCJlbWFpbCI6ImhrQG1vYmlnZXN0dXJlLmNvbSIsInJvbGVzX2lkIjozLCJpc0FjdGl2ZSI6dHJ1ZSwiY3JlYXRlZEF0IjoiMjAxNy0xMC0wM1QxMzo0NzoyNS4wMDBaIiwidXBkYXRlZEF0IjoiMjAxNy0xMC0xMFQxMToyMDowNi4wMDBaIiwiY3JlYXRlZEJ5IjoiQWRtaW4iLCJ1cGRhdGVkQnkiOiJBZG1pbiIsIlJvbGVzIjp7ImlkIjozLCJuYW1lIjoicHVibGlzaGVyIiwiZGVzY3JpcHRpb24iOiJQdWJsaXNoZXIgVXNlciIsImNyZWF0ZWRBdCI6IjIwMTctMTAtMDlUMTA6NTY6MTMu"
 *        "userinfo": {
 *            "id": 4,
 *            "firstname": "Hemakumar",
 *            "lastname": "mudimi",
 *            "email": "hk@mobigesture.com",
 *            "roles_id": 3,
 *            "Roles": {
 *                "id": 3,
 *                "name": "publisher",
 *                "description": "Publisher User",
 *                "createdAt": "2017-10-09T10:56:13.000Z",
 *                "updatedAt": "2017-10-09T10:56:13.000Z",
 *                "createdBy": "admin",
 *                "updatedBy": "admin",
 *                "Permissions": [
 *                    {
 *                        "id": 1,
 *                        "feature": "INGREDIENTS",
 *                        "read": true,
 *                        "write": true,
 *                        "publish": true,
 *                        "createdAt": null,
 *                        "updatedAt": null,
 *                        "createdBy": "admin",
 *                        "updatedBy": "admin",
 *                        "Roles_has_Permissions": {
 *                            "createdAt": "2017-10-09T10:56:13.000Z",
 *                            "updatedAt": "2017-10-09T10:56:13.000Z",
 *                            "permissions_id": 1,
 *                            "roles_id": 3
 *                        }
 *                    }
 *                ]
 *            }
 *        }
 *    }
 *
 * @apiError InvalidAuthentication 401 Authentication failed.
 *
 * @apiErrorExample Unauthorized:
 *    HTTP/1.1 401 Unauthorized
 *     {
 *       'success': false
 *       'message': 'Invalid credentials'
 *     }
 *
 * @apiExample {curl} Example usage:
 *     curl -i https://dev-pim-api.dermalogica.com/api/v1/login
 */
  router.post('/login', (req, res, next) => auth.login(req, res, next));

  router.post('/reset', (req, res, next) => auth.resetPassword(req, res, next));

  router.post('/change/:id', (req, res, next) => auth.changePassword(req, res, next));

  return router;
}
