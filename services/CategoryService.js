'use strict';

const _ = require('lodash');
const {Category} = require('../models');
const {ValidationError, RuntimeError, ResourceNotFoundError} = require('../helpers/bts-error-utils');

/**
 * Creates an instance of category service
 */
class CategoryService {

  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Creates a new category
   *
   * @param {object} swaggerParams - The swagger parameter
   * @param {IncomingMessage} res - The http response object
   * @param {function} next - The callback used to pass control to the next action/middleware
   */
  createCategory(swaggerParams, res, next) {
    let category = swaggerParams.category.value;
    let categoryDetails = new Category({
      'name': category.name
    });
    CheckCategory({name: category.name}, (categoryCheckError, categoryCheckResult) => {
      if (categoryCheckError) {
        return next(categoryCheckError);
      }
      if (!_.isEmpty(categoryCheckResult)) {
        let validationErrorObj = new ValidationError(
            'The category with name ' + category.name + ' already exists'
        );
        return next(validationErrorObj);
      }
      categoryDetails.save((saveError, saveCategory) => {
        if (saveError) {
          let runtimeError = new RuntimeError(
            'There was an error while creating a new user',
            saveError
          );
          return next(runtimeError);
        }
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 201;
        res.end(JSON.stringify(saveCategory));
      });
    });
  }

    /**
   * Get all category for user
   *
   * @param {object} swaggerParams - The swagger parameter
   * @param {IncomingMessage} res - The http response object
   * @param {function} next - The callback used to pass control to the next action/middleware
   */
     getCategoryList(swaggerParams, res, next) {
      Category.find({is_deleted: false}, (categoryFindError, categoryRecords) => {
        res.setHeader('Content-Type', 'application/json');
        if (categoryFindError) {
          let runtimeError = new RuntimeError(
            'There was an error while fetching all categories',
            categoryFindError
          );
          return next(runtimeError);
        }
        if (_.isEmpty(categoryRecords)) {
          res.statusCode = 204;
          return res.end();
        }
        res.statusCode = 200;
        res.end(JSON.stringify(categoryRecords));
      });
    }

      /**
   * Gets category details of given category_id
   *
   * @param {object} swaggerParams - The swagger parameter
   * @param {IncomingMessage} res - The http response object
   * @param {function} next - The callback used to pass control to the next action/middleware
   */
  getCategory(swaggerParams, res, next) {
    let categoryId = swaggerParams.category_id.value;
    CheckCategory({_id: categoryId, is_deleted: false}, (categoryCheckError, categoryCheckResult) => {
      if (categoryCheckError) {
        return next(categoryCheckError);
      }
      console.log('result==', categoryCheckResult)
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(categoryCheckResult));
    });
  }
}

/**
 * Checks for user existence
 *
 * @param {Object} query - The user findOne query
 * @param {function} callback - The callback used to pass control to the next action/middleware
 *
 * @private
 */
function CheckCategory(query, callback) {
    Category.findOne(query)
      .exec((categoryFindOneError, categoryRecord) => {
        if (categoryFindOneError) {
          let runtimeErrorObj = new RuntimeError(
            'There was an error while finding category',
            categoryFindOneError
          );
          return callback(runtimeErrorObj);
        }
        return callback(null, categoryRecord);
      });
  }

  module.exports = CategoryService;  