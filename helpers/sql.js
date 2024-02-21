const { BadRequestError } = require("../expressError");

/**
 * Convert js naming conventions to the corresponding sql column names for each key value pair
 * 
 * @param {object} dataToUpdate new keys and values to put in db
 *      can include { firstName, lastName, password, email, isAdmin }
 * @param {object} jsToSql key names mapped to their sql column 
 * 
 * @returns setCols is a string of the sql column names
 * @returns values are the new values
 */
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
