"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(
          `SELECT handle
           FROM companies
           WHERE handle = $1`,
        [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(
          `INSERT INTO companies
           (handle, name, description, num_employees, logo_url)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING handle, name, description, num_employees AS "numEmployees", logo_url AS "logoUrl"`,
        [
          handle,
          name,
          description,
          numEmployees,
          logoUrl,
        ],
    );
    const company = result.rows[0];

    return company;
  }

  /**
   * Selects and returns companies objects, may be passed an optional filter object
   * 
   * filter can contain: { nameLike, minEmployees, maxEmployees }
   * 
   * @param {object} filters - optional - name and value of the given filters
   * @returns array of objects for matching companies
   */

  static async findAll(filters) {
    let where = "";
    if (filters){
      const keys = Object.keys(filters);
      if (keys.length !== 0){
        where += "WHERE ";
        let clauses = [];
        if ("nameLike" in filters) {
          clauses.push("name ILIKE '%" + filters.nameLike + "%' ");
        }
        if ("minEmployees" in filters) {
          if ("maxEmployees" in filters) {
            if (filters.minEmployees >= filters.maxEmployees) {
              throw new BadRequestError("minEmployees must be less than maxEmployees");
            }
            clauses.push("num_employees BETWEEN " + filters.minEmployees + " AND " + filters.maxEmployees + " ");
          }
          else {
            clauses.push("num_employees >= " + filters.minEmployees + " ");
          }
        }
        else if ("maxEmployees" in filters) {
          clauses.push("num_employees <= " + filters.maxEmployees + " ");
        }
        const stringClauses = clauses.join("AND ");
        where += stringClauses;
      }
    }
    const companiesRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies ` + where + 
           `ORDER BY name`);
    return companiesRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(
          `SELECT handle,
                  name,
                  description,
                  num_employees AS "numEmployees",
                  logo_url AS "logoUrl"
           FROM companies
           WHERE handle = $1`,
        [handle]);
    const companyInfo = companyRes.rows[0];
    if (!companyInfo) throw new NotFoundError(`No company: ${handle}`);

    const jobRes = await db.query(
      `SELECT id, title, salary, equity
      FROM jobs 
      WHERE company_handle = $1`,
      [handle]
    );
    const jobInfo = jobRes.rows;
    const company = {
      handle: companyInfo.handle,
      name: companyInfo.name,
      description: companyInfo.description,
      numEmployees: companyInfo.numEmployees,
      logoUrl: companyInfo.logoUrl,
      jobs: jobInfo
    };

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
        data,
        {
          numEmployees: "num_employees",
          logoUrl: "logo_url",
        });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE companies 
                      SET ${setCols} 
                      WHERE handle = ${handleVarIdx} 
                      RETURNING handle, 
                                name, 
                                description, 
                                num_employees AS "numEmployees", 
                                logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(
          `DELETE
           FROM companies
           WHERE handle = $1
           RETURNING handle`,
        [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
