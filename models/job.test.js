"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
    commonBeforeAll,
    commonBeforeEach,
    commonAfterEach,
    commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

const newJob = {
    title: "new",
    salary: 100,
    equity: "0.5",
    companyHandle: "c1"
};

describe("create", function () {

    test("works", async function () {
        let job = await Job.create(newJob);
        expect(job).toEqual(expect.objectContaining(newJob));

        const result = await db.query(
            `SELECT id,
          title, 
          salary, 
          equity, 
          company_handle AS "companyHandle"
     FROM jobs
     WHERE id = ${job.id}`);
        expect(result.rows).toEqual([expect.objectContaining(newJob)]);
    });
});

/************************************** findAll */

describe("findAll", function () {
    test("works: no filter", async function () {
        let jobs = await Job.findAll();
        expect(jobs).toEqual([
            {
                companyHandle: "c3",
                equity: "0.66",
                id: expect.any(Number),
                salary: 300,
                title: "h3"
            },
            {
                companyHandle: "c1",
                equity: "0.25",
                id: expect.any(Number),
                salary: 100,
                title: "j1"
            },
            {
                companyHandle: "c2",
                equity: "0.5",
                id: expect.any(Number),
                salary: 200,
                title: "j2"
            }]);
    });
});

/************************************** get */

describe("get", function () {
    test("works", async function () {
        let job = await Job.create(newJob);
        let jobResult = await Job.get(job.id);

        expect(jobResult).toEqual({
            title: "new",
            salary: 100,
            equity: "0.5",
            companyHandle: "c1",
            id: job.id
        });
    });

    test("not found if no such job", async function () {
        try {
            await Job.get(999999999);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});

/************************************** update */

describe("update", function () {
    const updateData = {
        title: "update",
        salary: 1,
        equity: "0.1",
    };

    test("works", async function () {
        let oldJob = await Job.create(newJob);
        let job = await Job.update(oldJob.id, updateData);
        expect(job).toEqual({
            id: oldJob.id,
            companyHandle: "c1",
            ...updateData,
        });

        const result = await db.query(
            `SELECT id,
          title, 
          salary, 
          equity, 
          company_handle AS "companyHandle"
           FROM jobs
           WHERE id = ${oldJob.id}`);
        expect(result.rows).toEqual([{
            id: oldJob.id,
            companyHandle: "c1",
            ...updateData,
        }]);
    });

    test("works: null fields", async function () {
        const updateDataSetNulls = {
            title: "update",
            salary: null,
            equity: null,
        };

        let oldJob = await Job.create(newJob);
        let job = await Job.update(oldJob.id, updateDataSetNulls);
        expect(job).toEqual({
            id: oldJob.id,
            companyHandle: "c1",
            ...updateDataSetNulls,
        });

        const result = await db.query(
            `SELECT id,
          title, 
          salary, 
          equity, 
          company_handle AS "companyHandle"
           FROM jobs
           WHERE id = ${oldJob.id}`);
        expect(result.rows).toEqual([{
            id: oldJob.id,
            companyHandle: "c1",
            ...updateDataSetNulls,
        }]);
    });

    test("not found if no such job", async function () {
        try {
            await Job.update(99999999, updateData);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });

    test("bad request with no data", async function () {
        try {
            let oldJob = await Job.create(newJob);
            await Job.update(oldJob.id, {});
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });

    test("bad request with company handle", async function () {
        try {
            const updateDataSetNulls = {
                title: "update",
                salary: null,
                equity: null,
                companyHandle: "c1"
            };

            let oldJob = await Job.create(newJob);
            await Job.update(oldJob.id, updateDataSetNulls);
            fail();
        } catch (err) {
            expect(err instanceof BadRequestError).toBeTruthy();
        }
    });
});

/************************************** remove */

describe("remove", function () {
    test("works", async function () {
        let oldJob = await Job.create(newJob);
        await Job.remove(oldJob.id);
        const res = await db.query(
            `SELECT id FROM jobs WHERE id=${oldJob.id}`);
        expect(res.rows.length).toEqual(0);
    });

    test("not found if no such company", async function () {
        try {
            await Job.remove(99999999);
            fail();
        } catch (err) {
            expect(err instanceof NotFoundError).toBeTruthy();
        }
    });
});