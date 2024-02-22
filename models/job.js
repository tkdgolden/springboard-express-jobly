"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, company_handle }
   *
   * Returns { id, title, salary, equity, company_handle }
   *
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const result = await db.query(
          `INSERT INTO jobs
           (title, salary, equity, company_handle)
           VALUES ($1, $2, $3, $4)
           RETURNING id, title, salary, equity, company_handle AS "companyHandle"`,
        [
            title, 
            salary, 
            equity, 
            companyHandle
        ],
    );
    const job = result.rows[0];

    return job;
  }

  /**
   * Selects and returns jobs objects, may be passed an optional filter object
   * 
   * filter can contain: { title, minSalary, hasEquity }
   * 
   * @param {object} filters - optional - name and value of the given filters
   * @returns array of objects for matching jobs
   */

  static async findAll(filters) {
    let where = "";
    if (filters){
      const keys = Object.keys(filters);
      if (keys.length !== 0){
        let clauses = [];
        if ("hasEquity" in filters) {
          if (filters.hasEquity === true) {
            where += "WHERE ";
            clauses.push("equity > 0 ");
          }
        }
        else {
          where += "WHERE ";
        }
        if ("title" in filters) {
          clauses.push("title ILIKE '%" + filters.title + "%' ");
        }
        if ("minSalary" in filters) {
          clauses.push("salary >= " + filters.minSalary + " ");
        }
        const stringClauses = clauses.join("AND ");
        where += stringClauses;
      }
    }
    console.log(where);
    const jobsRes = await db.query(
          `SELECT id,
                title, 
                salary, 
                equity, 
                company_handle AS "companyHandle"
           FROM jobs ` + where + 
           `ORDER BY title`);
    return jobsRes.rows;
  }

  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(id) {
    const jobsRes = await db.query(
        `SELECT id,
              title, 
              salary, 
              equity, 
              company_handle AS "companyHandle"
         FROM jobs
         WHERE id = $1`,
         [id]);
    const job = jobsRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
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

  static async update(id, data) {
    if ("companyHandle" in data) {
        throw new BadRequestError("Cannot update company.");
    }
    const { setCols, values } = sqlForPartialUpdate( data, {});
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `UPDATE jobs 
                      SET ${setCols} 
                      WHERE id = ${handleVarIdx} 
                      RETURNING id, title, salary, equity, company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No company: ${id}`);

    return job;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(id) {
    const result = await db.query(
          `DELETE
           FROM jobs
           WHERE id = $1
           RETURNING id`,
        [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No company: ${id}`);
  }
}


module.exports = Job;
