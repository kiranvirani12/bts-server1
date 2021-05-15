'use strict';

const _ = require('lodash');
const async = require('async');
const {Category, SubCategory, ProductType} = require('../models');
const {RuntimeError, ValidationError, ResourceNotFoundError} = require('../helpers/bts-error-utils');

/**
 * Creates an instance of camera sub-category service
 */
class SubCategoryService {

  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Creates a new sub-category
   *
   * @param {object} swaggerParams - The swagger parameter
   * @param {IncomingMessage} res - The http response object
   * @param {function} next - The callback used to pass control to the next action/middleware
   */
  createSubCategory(swaggerParams, res, next) {
    let subCategory = swaggerParams.subCategory.value;
    let categoryId = subCategory.category_id;
    let subCategoryName = _.trim(subCategory.name);
    async.parallel([
      (cb) => {
        checkCategory(categoryId, (categoryCheckError) => {
          if (categoryCheckError) {
            return cb(categoryCheckError);
          }
          return cb();
        });
      },
      (cb) => {
        SubCategory.findOne({
          category_id: categoryId,
          name: {$regex: new RegExp('^' + subCategoryName, 'i')}
        }, (subCategoryError, subCategoryRecord) => {
          if (subCategoryError) {
            let runtimeError = new RuntimeError(
              'There was an error while finding a sub-category with sub-category name' + subCategoryName,
              subCategoryError
            );
            return cb(runtimeError);
          }
          if (!_.isEmpty(subCategoryRecord)) {
            let validationErrorObj = new ValidationError(
              'The subCategory with name ' + subCategoryName + ' already exist in the system'
            );
            return cb(validationErrorObj);
          }
          return cb();
        });
      }
    ], (parallelError) => {
      if (parallelError) {
        return next(parallelError);
      }
      let subCategoryDetails = new SubCategory({
        'category_id': categoryId,
        'name': subCategory.name
      });
      subCategoryDetails.save((saveError, saveSubCategory) => {
        if (saveError) {
          let runtimeError = new RuntimeError(
            'There was an error while creating a new subCategory',
            saveError
          );
          return next(runtimeError);
        }
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 201;
        res.end(JSON.stringify(saveSubCategory));
      });
    });
  }

  /**
   * Get list of sub-category for admin
   *
   * @param {object} swaggerParams - The swagger parameter
   * @param {IncomingMessage} res - The http response object
   * @param {function} next - The callback used to pass control to the next action/middleware
   */
  getSubCategoryListForAdmin(swaggerParams, res, next) {
    SubCategory.find({}, (subCategoryFindError, subCategoryRecords) => {
      res.setHeader('Content-Type', 'application/json');
      if (subCategoryFindError) {
        let runtimeError = new RuntimeError(
          'There was an error while fetching all sub-categories',
          subCategoryFindError
        );
        return next(runtimeError);
      }
      if (_.isEmpty(subCategoryRecords)) {
        res.statusCode = 204;
        return res.end();
      }
      res.statusCode = 200;
      res.end(JSON.stringify(subCategoryRecords));
    });
  }

  /**
   * Gets list of sub-categories
   *
   * @param {object} swaggerParams - The swagger parameter
   * @param {IncomingMessage} res - The http response object
   * @param {function} next - The callback used to pass control to the next action/middleware
   */
  getSubCategoryList(swaggerParams, res, next) {
    SubCategory.find({isDelete: false}, (subCategoryFindError, subCategoryRecords) => {
      res.setHeader('Content-Type', 'application/json');
      if (subCategoryFindError) {
        let runtimeError = new RuntimeError(
          'There was an error while fetching all sub-categories',
          subCategoryFindError
        );
        return next(runtimeError);
      }
      if (_.isEmpty(subCategoryRecords)) {
        res.statusCode = 204;
        return res.end();
      }
      res.statusCode = 200;
      res.end(JSON.stringify(subCategoryRecords));
    });
  }

  /**
   * Gets all sub-category of particular category
   *
   * @param {object} swaggerParams - The swagger parameter
   * @param {IncomingMessage} res - The http response object
   * @param {function} next - The callback used to pass control to the next action/middleware
   */
  getSubCategoryWithCategoryId(swaggerParams, res, next) {
    let categoryId = swaggerParams.category_id.value;
    checkCategory(categoryId, (categoryCheckError) => {
      if (categoryCheckError) {
        return next(categoryCheckError);
      }
      SubCategory.find({category_id: categoryId, isDelete: false}, (subCategoryFindError, subCategoryRecords) => {
        res.setHeader('Content-Type', 'application/json');
        if (subCategoryFindError) {
          let runtimeError = new RuntimeError(
            'There was an error while fetching all sub-categories',
            subCategoryFindError
          );
          return next(runtimeError);
        }
        if (_.isEmpty(subCategoryRecords)) {
          res.statusCode = 204;
          return res.end();
        }
        res.statusCode = 200;
        res.end(JSON.stringify(subCategoryRecords));
      });
    });
  }

  /**
   * Gets subCategory details of given sub_category_id
   *
   * @param {object} swaggerParams - The swagger parameter
   * @param {IncomingMessage} res - The http response object
   * @param {function} next - The callback used to pass control to the next action/middleware
   */
  getSubCategory(swaggerParams, res, next) {
    let subCategoryId = swaggerParams.sub_category_id.value;
    checkSubCategory({_id: subCategoryId, isDelete: false}, (subCategoryCheckError, subCategoryCheckResult) => {
      if (subCategoryCheckError) {
        return next(subCategoryCheckError);
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(subCategoryCheckResult));
    });
  }

  /**
   * Updates sub-category details of given sub_category_id
   *
   * @param {object} swaggerParams - The swagger parameter
   * @param {IncomingMessage} res - The http response object
   * @param {function} next - The callback used to pass control to the next action/middleware
   */
  updateSubCategory(swaggerParams, res, next) {
    let subCategoryId = swaggerParams.sub_category_id.value;
    let payload = swaggerParams.subCategory.value;
    let subCategoryName = _.trim(payload.name);
    async.parallel([
      (cb) => {
        checkSubCategory({_id: subCategoryId, isDelete: false}, (subCategoryCheckError, subCategoryCheckResult) => {
          if (subCategoryCheckError) {
            return cb(subCategoryCheckError);
          }
          cb(null, subCategoryCheckResult);
        });
      },
      (cb) => {
        checkCategory(payload.category_id, (categoryCheckError) => {
          if (categoryCheckError) {
            return cb(categoryCheckError);
          }
          return cb();
        });
      },
      (cb) => {
        SubCategory.findOne({
          category_id: payload.category_id,
          name: {$regex: new RegExp('^' + subCategoryName, 'i')},
          _id: {$ne: subCategoryId}
        }, (subCategoryNameFindError, subCategoryNameRecord) => {
          if (subCategoryNameFindError) {
            let runtimeError = new RuntimeError(
              'There was an error while fetching sub-category with name ' + subCategoryName,
              subCategoryNameFindError
            );
            return cb(runtimeError);
          }
          if (!_.isEmpty(subCategoryNameRecord)) {
            let validationErrorObj = new ValidationError(
              'The sub-category name ' + subCategoryName + ' already exist in the system'
            );
            return cb(validationErrorObj);
          }
          cb();
        });
      }
    ], (parallelErr, parallelResult) => {
      if (parallelErr) {
        return next(parallelErr);
      }
      let subCategoryRecord = parallelResult[0];
      if (!_.isEqual(subCategoryRecord.category_id, payload.category_id)) {
        ProductType.updateMany(
          {sub_category_id: subCategoryRecord._id},
          {'$set': {category_id: payload.category_id}},
          {'multi': true}, (updateProductTypeError) => {
            if (updateProductTypeError) {
              let runtimeErrorObj = new RuntimeError(
                'There was an error while updating category of product-type ',
                updateProductTypeError
              );
              return next(runtimeErrorObj);
            }
            return next();
          });
      }
      subCategoryRecord.name = payload.name;
      subCategoryRecord.category_id = payload.category_id;
      subCategoryRecord.save((updateSubCategoryError, updatedRecord) => {
        if (updateSubCategoryError) {
          let runtimeErrorObj = new RuntimeError(
            'There was an error while updating sub-category with id ' + subCategoryId,
            updateSubCategoryError
          );
          return next(runtimeErrorObj);
        }
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(updatedRecord));
      });
    });
  }

  /**
   * Updates sub-category status of given sub_category_id
   *
   * @param {object} swaggerParams - The swagger parameter
   * @param {IncomingMessage} res - The http response object
   * @param {function} next - The callback used to pass control to the next action/middleware
   */
  updateSubCategoryStatus(swaggerParams, res, next) {
    let subCategoryId = swaggerParams.sub_category_id.value;
    let payload = swaggerParams.subCategory.value;
    checkSubCategory({_id: subCategoryId}, (subCategoryCheckError, subCategoryCheckResult) => {
      if (subCategoryCheckError) {
        return next(subCategoryCheckError);
      }
      res.setHeader('Content-Type', 'application/json');
      subCategoryCheckResult.isDelete = payload.isDelete;
      if (payload.isDelete === true) {
        ProductType.find({sub_category_id: subCategoryId}, (findError, productTypeRecords) => {
          if (findError) {
            let runtimeErrorObj = new RuntimeError(
              'There was an error while fetching product-type with sub-category ' + subCategoryId,
              findError
            );
            return next(runtimeErrorObj);
          }
          if (!_.isEmpty(productTypeRecords)) {
            let validationErrorObj = new ValidationError(
              'The product-types with given sub-category ' + subCategoryId + ' exists'
            );
            return next(validationErrorObj);
          }
          _updateSubCategoryStatus(subCategoryCheckResult, (updateError, subCategoryRecord) => {
            if (updateError) {
              return next(updateError);
            }
            res.statusCode = 200;
            return res.end(JSON.stringify(subCategoryRecord));
          });
        });
      } else {
        _updateSubCategoryStatus(subCategoryCheckResult, (updateError, subCategoryRecord) => {
          if (updateError) {
            return next(updateError);
          }
          res.statusCode = 200;
          return res.end(JSON.stringify(subCategoryRecord));
        });
      }
    });
  }
}

/**
 * Checks for category existence
 *
 * @param {String} categoryId - The category_id
 * @param {function} callback - The callback used to pass control to the next action/middleware
 *
 * @private
 */
function checkCategory(categoryId, callback) {
  Category.findOne({_id: categoryId, isDelete: false}, (categoryFindError, categoryRecord) => {
    if (categoryFindError) {
      let runtimeError = new RuntimeError(
        'There was an error while fetching category with id ' + categoryId,
        categoryFindError
      );
      return callback(runtimeError);
    }
    if (_.isEmpty(categoryRecord)) {
      let validationErrorObj = new ValidationError(
        'The category with id ' + categoryId + ' does not exists'
      );
      return callback(validationErrorObj);
    }
    return callback();
  });
}

/**
 * Checks for sub-category existence
 *
 * @param {Object} query - The sub-category findOne query
 * @param {function} callback - The callback used to pass control to the next action/middleware
 *
 * @private
 */
function checkSubCategory(query, callback) {
  SubCategory.findOne(query, (subCategoryFindError, subCategoryFindRecord) => {
    if (subCategoryFindError) {
      let runtimeError = new RuntimeError(
        'There was an error while finding sub-category with id ' + query._id,
        subCategoryFindError
      );
      return callback(runtimeError);
    }
    if (_.isEmpty(subCategoryFindRecord)) {
      let resourceNotFoundOErrorObj = new ResourceNotFoundError(
        'The sub-category with id ' + query._id + ' does not exists'
      );
      return callback(resourceNotFoundOErrorObj);
    }
    callback(null, subCategoryFindRecord);
  });
}

/**
 * Update sub-category status
 *
 * @param {Object} subCategoryRecord - The sub-category object
 * @param {function} callback - The callback used to pass control to the next action/middleware
 *
 * @private
 */
function _updateSubCategoryStatus(subCategoryRecord, callback) {
  subCategoryRecord.save((updateSubCategoryError, updatedRecord) => {
    if (updateSubCategoryError) {
      let runtimeErrorObj = new RuntimeError(
        'There was an error while updating sub-category status for sub_category_id ' + subCategoryRecord._id,
        updateSubCategoryError
      );
      return callback(runtimeErrorObj);
    }
    return callback(null, updatedRecord);
  });
}

module.exports = SubCategoryService;