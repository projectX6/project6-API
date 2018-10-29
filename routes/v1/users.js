'use strict';
const router = require('express').Router();
const bcrypt = require('bcrypt');
const Users = require('../../models').Users;
const Roles = require('../../models').Roles;
const Permissions = require('../../models').Permissions;
const countries = require('../../models').countries;
const Users_has_countries = require('../../models').Users_has_countries;
const Op = require('../../models').Sequelize.Op;
const utils = require('./utils');

const path = require('path');
const EmailTemplate = require('email-templates').EmailTemplate
// To get email templates

var templatesDir = path.resolve(__dirname, '../..', 'templates');
var resetTemplate = new EmailTemplate(path.join(templatesDir, 'newuser'));

class UsersClass {
  constructor (app) {
    // app assigned to this.app
    this.app = app;
  }

  get(req, res) {
    Users.findOne({
      attributes: [
        'id', 'firstname', 'lastname', 'email'
      ],
      where: {
        id: req.params.id,
        isActive: 1,
      },
      include: [
        {
          model: Roles,
          as: 'Roles',
          include: [
            {
              model: Permissions,
              as: 'rolesHasPermissions'
            },
          ]
        },
        {
          model: countries,
          as: 'usersHasCountries'
        }
      ]
    })
    .then(user => {
      let u = user.get();
      if(!u.Roles.isTranslator) {
        u.usersHasCountries = undefined;
      }
      res.status(200).send(u);
    })
    .catch(error => {
      console.error(error);
      res.status(400).send(error);
    });
  }

  getAll(req, res) {
    let config = {
      attributes: [
        'id', 'firstname', 'lastname', 'email', 'createdAt', 'updatedAt'
      ],
      where: {
        isActive: 1,
        [Op.or]: [
          {
            firstname: {
              [Op.like]: '%' + (req.query.search ? req.query.search : '') + '%'
            }
          },
          {
            lastname: {
              [Op.like]: '%' + (req.query.search ? req.query.search : '') + '%'
            }
          },
          {
            email: {
              [Op.like]: '%' + (req.query.search ? req.query.search : '') + '%'
            }
          }
        ]
      },
      order: [ [ 'id', 'DESC' ] ],
      include: [
        {
          model: Roles,
          as: 'Roles',
          // through: {
          //   where: {
          //     [Op.or]: [
          //       {
          //         name: {
          //           [Op.like]: '%' + (req.query.search ? req.query.search : '') + '%'
          //         }
          //       }
          //     ]
          //   }
          // },
          include: [{
            model: Permissions,
            as: 'rolesHasPermissions'
          }]
        },
        {
          model: countries,
          as: 'usersHasCountries'
        }
      ]
    };
    if(req.query.sort && req.query.order) {
      config.order = [ [ req.query.sort, req.query.order === 'desc' ? 'DESC' : 'ASC' ] ];
    }
    var offset;
    var limit;
    if (parseInt(req.query.pageSize) && req.query.pageSize && parseInt(req.query.pageNo) && req.query.pageNo) {
      offset = req.query.pageNo && req.query.pageSize ? (parseInt(req.query.pageNo) - 1) * req.query.pageSize : 0;
      // config.offset = req.query.pageNo && req.query.pageSize ? (parseInt(req.query.pageNo) - 1) * req.query.pageSize : 0;
      limit = req.query.pageSize ? parseInt(req.query.pageNo) * parseInt(req.query.pageSize) : 10;
      // config.limit = req.query.pageSize ? parseInt(req.query.pageSize) : 10;
    }
    if (parseInt(req.query.limit) != undefined && req.query.limit != undefined && parseInt(req.query.offset) != undefined && req.query.offset != undefined) {
      // config.offset = req.query.pageNo && req.query.pageSize ? (parseInt(req.query.pageNo) - 1) * req.query.pageSize : 0;
      offset = parseInt(req.query.offset);
      // config.limit = req.query.pageSize ? parseInt(req.query.pageSize) : 10;
      limit = parseInt(req.query.limit);
    }
    Users.findAll(config)
    .then(users => {
      var results = [];
      if (parseInt(req.query.pageSize) && req.query.pageSize && parseInt(req.query.pageNo) && req.query.pageNo) {
        for (var i = offset; i < users.length && i < limit; i++) {
          results.push(users[i]);
        }
      }else if(parseInt(req.query.limit) != undefined && req.query.limit != undefined && parseInt(req.query.offset) != undefined && req.query.offset != undefined && offset != undefined && limit != undefined ) {
        for (var i = offset; i < users.length && i < limit + offset; i++) {
          results.push(users[i]);
        }
      } else {
        results = users;
      }
      for (let i = 0; i < results.length; i++) {
        let u = results[i].get();
        console.log("u", u)
        if(!u.Roles.isTranslator) {
          u.usersHasCountries = undefined;
        }
        results[i] = u;
      }
      let data = {
        result: results,
        totalCount: users.length,
        pageSize: req.query.pageSize ? req.query.pageSize : '',
        pageNo: req.query.pageNo ? req.query.pageNo : '',
        search: '%' + (req.query.search ? req.query.search : '') + '%',
        offset: offset,
        limit: limit
      }
      res.status(200).send(data);
    })
    .catch(error => {
      console.error(error);
      res.status(400).send(error);
    });
  }

  getRoles(req, res) {
    Roles.findAll({
      attributes: [
        'id', 'name', 'description'
      ],
      include: [
        { model: Permissions, as: 'rolesHasPermissions' },
      ]
    })
    .then(users => {
      res.status(200).send(users);
    })
    .catch(error => {
      console.error(error);
      res.status(400).send(error);
    });
  }

  async update(req, res) {
    try {
      let role = await Roles.findOne({
        where: {
          id: req.body.roles_id,
        }
      })
      if (role) {
        let data = {
          firstname: req.body.firstname,
          lastname: req.body.lastname,
          roles_id: req.body.roles_id,
          updatedBy: req.decoded.firstname,
        }
        if (req.body.password) {
          // data.password = req.body.password;
          // data.password = bcrypt.hashSync(req.body.password, 10);
        }
        let results = await Users.update(data,{
          attributes: [
            'firstname', 'lastname', 'password', 'roles_id', 'updatedBy'
          ],
          where: {
            id: req.params.id
          }
        })
        if(role.isTranslator && req.body.countries_id){
          let c = await countries.findAll({
            where: {
              id: req.body.countries_id,
              isActive: 1,
            }
          });
          let uHCArr = [];
          console.log('c', c);
          if (c) {
            let removeUHC = await Users_has_countries.destroy({
              where: {
                Users_id: req.params.id,
              }
            });
            c.forEach(async (cId) => {
              let uHC = await Users_has_countries.create({
                Users_id: req.params.id,
                countries_id: cId.id,
                createdBy: req.decoded.firstname,
                updatedBy: req.decoded.firstname,
              });
              console.log('uHC', uHC);
              uHCArr.push(uHC);
            });
          } else {
            console.error({ err: 'requested countries not found.' });
          }
        }
        let user = await Users.findOne({
          attributes: [
            'id', 'firstname', 'lastname', 'email'
          ],
          where: {
            id: req.params.id,
            isActive: 1,
          },
          include: [
            {
              model: Roles,
              as: 'Roles',
              include: [
                {
                  model: Permissions,
                  as: 'rolesHasPermissions'
                }
              ]
            },
            {
              model: countries,
              as: 'usersHasCountries'
            }
          ]
        })
        let u = user.get();
        if(!u.Roles.isTranslator) {
          u.usersHasCountries = undefined;
        }
        utils.eventLoger('users', 'updated user info ' + u.firstname, req.decoded.firstname);
        res.status(200).send(u);
        // res.status(200).send(user);
      } else {
        let error = { error : 'requested role not available' };
        res.status(400).send(error);
      }
    } catch (e) {
      console.error(e);
      res.status(400).send(e);
    }
  }

  async add(req, res) {
    try {
      let user = await Users.findOne({
        where: {
          email: req.body.email,
          isActive: 1,
        }
      });
      if(user){
        res.status(400).send({ error: "User already exist" });
      } else {
        let role = await Roles.findOne({
          where: {
            id: req.body.roles_id,
          }
        })
        if (role) {
          let uHCArr = [];
          let results = await Users.create({
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            roles_id: req.body.roles_id,
            password: bcrypt.hashSync(''+req.body.password, 10),
            // password: req.body.password,
            isActive: true,
            createdBy: req.decoded.firstname,
            updatedBy: req.decoded.firstname,
            resetToken : bcrypt.hashSync(Date.now() + req.body.email, 10).replace(/[./$]/g, ''),
            resetPassword: 1,
            resetRequestedOn: new Date()
          });
          console.log('role', role);
          if(role.isTranslator){
            let c = await countries.findAll({
              where: {
                id: req.body.countries_id,
                isActive: 1,
              }
            });
            console.log('c', c);
            if (c) {
              c.forEach(async (cId) => {
                let uHC = await Users_has_countries.create({
                  Users_id: results.id,
                  countries_id: cId.id,
                  createdBy: req.decoded.firstname,
                  updatedBy: req.decoded.firstname,
                });
                console.log('uHC', uHC);
                uHCArr.push(uHC);
              });
            } else {
              console.error({ err: 'requested countries not found.' });
            }
          } else {
            console.log("Requested user not have translator role");
          }
          var instData = results.get();
          var transporter = utils.mailHelper();
          var redirectLink = req.headers.origin + '/#/reset/' + instData['resetToken'];
          delete instData['password'];
          delete instData['isActive'];
          delete instData['createdBy'];
          delete instData['updatedBy'];
          delete instData['updatedAt'];
          delete instData['createdAt'];
          delete instData['resetToken'];
          delete instData['resetPassword'];
          delete instData['resetRequestedOn'];
          if (instData) {
            utils.eventLoger('users', 'added '+ instData.firstname +' to user', req.decoded.firstname);
          }
          var locals = {
            link: redirectLink,
            url: req.headers.origin
          };
          // setup e-mail data with unicode symbols
          resetTemplate.render(locals, function (err, results) {
            if (err) {
              return console.error(err);
            }
            var mailOptions = {
              from: process.env.EMAIL_FROM || 'noreply@dermalogica.com',// sender address
              to: [req.body.email],
              subject: 'Welcome to PIM', // Subject line
              html: results.html
            };

            // send mail with defined transport object
            transporter.sendMail(mailOptions, function(error, info) {
              if (error) {
                return res.status(400).send({
                  "error": error.message
                })
              }
              return res.status(200).send({
                "message": "An email will send to your Email address that includes an Activate link. Please check your email right away, as the link expires after 48 hours.",
                "user": instData,
                "usersHasCountries": uHCArr
              })
            });
          });
        } else {
          let error = { error : 'requested role not available' };
          res.status(400).send(error);
        }
      }
    } catch (e) {
      console.error(e);
      res.status(400).send(e);
    }
  }

  del(req, res) {
    Users.findOne({
      attributes: [
        'id', 'firstname'
      ],
      where: {
        id: req.params.id,
      }
    })
    .then(result => {
      utils.eventLoger('users', 'deleted user info ' + result.firstname, req.decoded.firstname);
      Users.update({
        isActive: 0,
        updatedBy: req.decoded.firstname,
      },{
        attributes: [
          'isActive', 'updatedBy'
        ],
        where: {
          id: req.params.id
        }
      })
      .then(results => {
        res.status(200).send({'message': 'success'});
      })
      .catch(error => {
        res.status(400).send(error);
      });
    })
    .catch(error => {
      res.status(400).send(error);
    });
 }
}

let user = new UsersClass();

/**
 * @api {get} /api/v1/users/roles Get all roles
 * @apiSampleRequest https://dev-pim-api.dermalogica.com/api/v1/users/roles
 * @apiName GetRoles
 * @apiGroup Users
 *
 * @apiDescription To fetch all roles
 *
 * @apiPermission Authorized users only
 *
 * @apiHeader {String} API-Key  application unique api-key
 * @apiHeader {String} Authorization application access token
 *
 * @apiSuccess {Object} result results of roles.
 * @apiSuccess {String} firstName Firstname of the users.
 * @apiSuccess {String} lastName  Lastname of the users.
 * @apiSuccess {String} email  email of the users.
 * @apiSuccess {Number} id unique id of the users.
 * @apiSuccess {Object} Roles roles of users.
 *
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 200 OK
 *    {
 *    "result": [
 *        {
 *            "id": 2,
 *            "firstName": "Test",
 *            "lastName": "test",
 *            "email": "test@t",
 *            "createdAt": "2017-10-03T06:40:59.000Z",
 *            "updatedAt": "2017-10-10T10:02:56.000Z",
 *            "Roles": {
 *                "id": 1,
 *                "name": "ADMIN",
 *                "description": "Admin User",
 *                "createdAt": null,
 *                "updatedAt": null,
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
 *                            "createdAt": null,
 *                            "updatedAt": null,
 *                            "permissions_id": 1,
 *                            "roles_id": 1
 *                        }
 *                    }
 *                ]
 *             }
 *        ]
 *    }
 *
 * @apiError InvalidAuthentication 403 Authentication failed.
 *
 * @apiErrorExample Forbidden:
 *    HTTP/1.1 403 Forbidden
 *     {
 *       'success': false
 *       'message': 'Login failed'
 *     }
 *
 * @apiExample {curl} Example usage:
 *     curl -i https://dev-pim-api.dermalogica.com/api/v1/users/roles
 */
router.get('/roles',user.getRoles);

/**
 * @api {get} /api/v1/users/ Get all
 * @apiSampleRequest https://dev-pim-api.dermalogica.com/api/v1/users/
 * @apiName GetUsers
 * @apiGroup Users
 *
 * @apiDescription to get all users
 *
 * @apiPermission Authorized users only
 *
 * @apiHeader {String} API-Key  application unique api-key
 * @apiHeader {String} Authorization application access token
 *
 * @apiSuccess {Object} result results of users.
 * @apiSuccess {Number} id Unique id of the users.
 * @apiSuccess {String} firstName Firstname of the users.
 * @apiSuccess {String} lastName  Lastname of the users.
 * @apiSuccess {String} email  email of the users.
 * @apiSuccess {Object} Roles roles of users.
 * @apiSuccess {String} createdAt  createdAt of the user.
 * @apiSuccess {String} createdBy createdBy of users.
 *
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 200 OK
 *    {
 *      "result": [
 *        {
 *            "id": 2,
 *            "firstName": "Test",
 *            "lastName": "test",
 *            "email": "test@t",
 *            "createdAt": "2017-10-03T06:40:59.000Z",
 *            "updatedAt": "2017-10-10T10:02:56.000Z",
 *            "Roles": {
 *                "id": 1,
 *                "name": "ADMIN",
 *                "description": "Admin User",
 *                "createdAt": null,
 *                "updatedAt": null,
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
 *                            "createdAt": null,
 *                            "updatedAt": null,
 *                            "permissions_id": 1,
 *                            "roles_id": 1
 *                        }
 *                    }
 *                ]
 *            }
 *         }
 *      ]
 *    }
 *
 * @apiError InvalidAuthentication 403 Authentication failed.
 *
 * @apiErrorExample Forbidden:
 *    HTTP/1.1 403 Forbidden
 *     {
 *       'success': false
 *       'message': 'Login failed'
 *     }
 *
 * @apiExample {curl} Example usage:
 *     curl -i https://dev-pim-api.dermalogica.com/api/v1/users/
 */
router.get('/', user.getAll);

/**
 * @api {get} /api/v1/users/:id Get by ID
 * @apiSampleRequest https://dev-pim-api.dermalogica.com/api/v1/users/:id
 * @apiName GetUser
 * @apiGroup Users
 *
 * @apiDescription To get user information using id
 *
 * @apiPermission Authorized users only
 *
 * @apiHeader {String} API-Key  application unique api-key
 * @apiHeader {String} Authorization application access token
 *
 * @apiParam {Number} id Unique id of the user.
 *
 * @apiSuccess {Number} id Unique id of the user.
 * @apiSuccess {String} firstName Firstname of the user.
 * @apiSuccess {String} lastName  Lastname of the user.
 * @apiSuccess {String} email  email of the user.
 * @apiSuccess {Object} Roles roles of users.
 * @apiSuccess {String} createdAt  createdAt of the user.
 * @apiSuccess {String} createdBy createdBy of users.
 *
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 200 OK
 *    {
 *      "id": 4,
 *      "firstName": "Hemakumar",
 *      "lastName": "mudimi",
 *      "email": "hk@mobigesture.com",
 *      "Roles": {
 *          "id": 3,
 *          "name": "publisher",
 *          "description": "Publisher User",
 *          "createdAt": "2017-10-09T10:56:13.000Z",
 *          "updatedAt": "2017-10-09T10:56:13.000Z",
 *          "createdBy": "admin",
 *          "updatedBy": "admin",
 *          "Permissions": [
 *              {
 *                  "id": 1,
 *                  "feature": "INGREDIENTS",
 *                  "read": true,
 *                  "write": true,
 *                  "publish": true,
 *                  "createdAt": null,
 *                  "updatedAt": null,
 *                  "createdBy": "admin",
 *                  "updatedBy": "admin",
 *                  "Roles_has_Permissions": {
 *                      "createdAt": "2017-10-09T10:56:13.000Z",
 *                      "updatedAt": "2017-10-09T10:56:13.000Z",
 *                      "permissions_id": 1,
 *                      "roles_id": 3
 *                  }
 *              }
 *          ]
 *      }
 *  }
 *
 * @apiError InvalidAuthentication 403 Authentication failed.
 *
 * @apiErrorExample Forbidden:
 *    HTTP/1.1 403 Forbidden
 *     {
 *       'success': false
 *       'message': 'Login failed'
 *     }
 *
 * @apiExample {curl} Example usage:
 *     curl -i https://dev-pim-api.dermalogica.com/api/v1/users/:id
 */
router.get('/:id', user.get);

/**
 * @api {post} /api/v1/users/ Add
 * @apiSampleRequest https://dev-pim-api.dermalogica.com/api/v1/users/
 * @apiName AddUser
 * @apiGroup Users
 *
 * @apiDescription To create a new user
 *
 * @apiPermission Authorized users only
 *
 * @apiHeader {String} API-Key  application unique api-key
 * @apiHeader {String} Authorization application access token
 *
 * @apiParam {String} firstName Firstname of the user.
 * @apiParam {String} lastName  Lastname of the user.
 * @apiParam {String} email  email of the user.
 * @apiParam {Number} roles_id role id of the user.
 * @apiParam {String} password password of the user.
 *
 * @apiSuccess {Number} id Unique id of the user.
 * @apiSuccess {String} firstName Firstname of the user.
 * @apiSuccess {String} lastName  Lastname of the user.
 * @apiSuccess {String} email  email of the user.
 * @apiSuccess {Number} roles_id role id of the user.
 * @apiSuccess {String} password password of the user.
 * @apiSuccess {String} createdAt  createdAt of the user.
 * @apiSuccess {String} createdBy createdBy of users.
 *
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 200 OK
 *    {
 *          "id": 33,
 *          "firstname": "rahul",
 *          "lastname": "rahul",
 *          "email": "rah@mg.com",
 *          "roles_id": "1",
 *          "password": "12345"
 *    }
 * @apiError InvalidAuthentication 403 Authentication failed.
 *
 * @apiErrorExample Forbidden:
 *    HTTP/1.1 403 Forbidden
 *     {
 *       'success': false
 *       'message': 'Login failed'
 *     }
 *
 * @apiExample {curl} Example usage:
 *     curl -i https://dev-pim-api.dermalogica.com/api/v1/users/
 */
router.post('/', user.add);

/**
 * @api {put} /api/v1/users/:id Update
 * @apiSampleRequest https://dev-pim-api.dermalogica.com/api/v1/users/:id
 * @apiName UpdateUser
 * @apiGroup Users
 *
 * @apiDescription To update the user
 *
 * @apiPermission Authorized users only
 *
 * @apiHeader {String} API-Key  application unique api-key
 * @apiHeader {String} Authorization application access token
 *
 * @apiParam {String} id Unique id of the user.
 * @apiParam {String} firstName Firstname of the user.
 * @apiParam {String} lastName  Lastname of the user.
 * @apiParam {String} email  email of the user.
 * @apiParam {Number} roles_id role id of the user.
 * @apiParam {String} password password of the user.
 *
 * @apiSuccess {Number} id Unique id of the user.
 * @apiSuccess {String} firstName Firstname of the user.
 * @apiSuccess {String} lastName  Lastname of the user.
 * @apiSuccess {String} email  email of the user.
 * @apiSuccess {Object} Roles  roles of the user.
 *
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 200 OK
 *    {
 *      "id": 3,
 *      "firstName": "user_first_name",
 *      "lastName": "user_last_name",
 *      "email": "user@email.com",
 *    }
 *
 * @apiError InvalidAuthentication 403 Authentication failed.
 *
 * @apiErrorExample Forbidden:
 *    HTTP/1.1 403 Forbidden
 *     {
 *       'success': false
 *       'message': 'Login failed'
 *     }
 *
 * @apiExample {curl} Example usage:
 *     curl -i https://dev-pim-api.dermalogica.com/api/v1/users/:id
 */
router.put('/:id', user.update);

/**
 * @api {delete} /api/v1/users/delete/:id Delete
 * @apiSampleRequest https://dev-pim-api.dermalogica.com/api/v1/users/:id
 * @apiName Delete
 * @apiGroup Users
 *
 * @apiDescription To delete user
 *
 * @apiPermission Authorized users only
 *
 * @apiHeader {String} API-Key  application unique api-key
 * @apiHeader {String} Authorization application access token
 *
 * @apiParam {Number} id of the user.
 *
 * @apiSuccess {String} message  success message.
 *
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 200 OK
 *    {
 *      "message": "success"
 *    }
 *
 * @apiError InvalidAuthentication 403 Authentication failed.
 *
 * @apiErrorExample Forbidden:
 *    HTTP/1.1 403 Forbidden
 *     {
 *       'success': false
 *       'message': 'Login failed'
 *     }
 *
 * @apiExample {curl} Example usage:
 *     curl -i https://dev-pim-api.dermalogica.com/api/v1/users/:id
 */
router.delete('/:id', user.del);

module.exports = router;
