"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  u2Token
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /cjobs */

const newJob = {
    title: "new",
    salary: 100,
    equity: 0.5,
    companyHandle: "c1"
};

describe("POST /jobs", function () {

  test("error for anon", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob);
    expect(resp.statusCode).toEqual(401);
  });

  test("ok for admin", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual(expect.objectContaining({job: {
        companyHandle: "c1",
        equity: "0.5",
        id: expect.any(Number),
        salary: 100,
        title: "new",
      }}));
  });

  test("error for non admin user", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
        .post("/jobs")
        .send({
          title: "bad"
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
        .post("/companies")
        .send({
          ...newJob,
          logoUrl: "not-a-url",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("ok for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
          [
            {
                title: "j1",
                salary: 100,
                equity: "0.2",
                companyHandle: "c1",
                id: expect.any(Number)
            },
            {
                title: "j2",
                salary: 200,
                equity: "0.3",
                companyHandle: "c2",
                id: expect.any(Number)
            },
            {
                title: "j3",
                salary: 300,
                equity: "0.4",
                companyHandle: "c3",
                id: expect.any(Number)
            }
          ],
    });
  });

  test("works: empty filter", async function () {
    const resp = await request(app).get("/jobs").send({});
    expect(resp.body).toEqual({
      jobs:
          [
            {
                title: "j1",
                salary: 100,
                equity: "0.2",
                companyHandle: "c1",
                id: expect.any(Number)
            },
            {
                title: "j2",
                salary: 200,
                equity: "0.3",
                companyHandle: "c2",
                id: expect.any(Number)
            },
            {
                title: "j3",
                salary: 300,
                equity: "0.4",
                companyHandle: "c3",
                id: expect.any(Number)
            }
          ],
    });
  });

  test("works: title, salary, and equity filter", async function () {
    const resp = await request(app).get("/jobs").send(
        { title: "j1",
            minSalary: 100,
            hasEquity: true});
    expect(resp.body).toEqual({
      jobs:
          [
            {
                title: "j1",
                salary: 100,
                equity: "0.2",
                companyHandle: "c1",
                id: expect.any(Number)
            }
          ],
    });
  });

  test("fails: test next() handler", async function () {
    // there's no normal failure event which will cause this route to fail ---
    // thus making it hard to test that the error-handler works with it. This
    // should cause an error, all right :)
    await db.query("DROP TABLE jobs CASCADE");
    const resp = await request(app)
        .get("/jobs")
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(500);
  });
});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const job = await request(app)
        .post("/jobs")
        .send(newJob)
        .set("authorization", `Bearer ${u2Token}`);
    const resp = await request(app).get(`/jobs/${job.body.job.id}`);
    expect(resp.body).toEqual({
      job: {
        id: job.body.job.id,
        equity: "0.5",
        companyHandle: "c1",
        salary: 100,
        title: "new"
    }});
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/99999999`);
    expect(resp.statusCode).toEqual(404);
  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admin", async function () {
    const job = await request(app)
    .post("/jobs")
    .send(newJob)
    .set("authorization", `Bearer ${u2Token}`);
    const resp = await request(app)
        .patch(`/jobs/${job.body.job.id}`)
        .send({
          title: "j1-new",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({
        job: {
          id: job.body.job.id,
          equity: "0.5",
          companyHandle: "c1",
          salary: 100,
          title: "j1-new"
      }});
  });

  test("unauth for anon", async function () {
        const job = await request(app)
    .post("/jobs")
    .send(newJob)
    .set("authorization", `Bearer ${u2Token}`);
    const resp = await request(app)
        .patch(`/jobs/${job.body.job.id}`)
        .send({
          title: "j1-new",
        });
    expect(resp.statusCode).toEqual(401);
  });

  test("unauth for non admin users", async function () {
    const job = await request(app)
    .post("/jobs")
    .send(newJob)
    .set("authorization", `Bearer ${u2Token}`);
    const resp = await request(app)
        .patch(`/jobs/${job.body.job.id}`)
        .send({
          title: "j1-new",
        })
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on no such job", async function () {
    const resp = await request(app)
        .patch(`/jobs/999999999`)
        .send({
          title: "new nope",
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });

  test("bad request on id change attempt", async function () {
    const job = await request(app)
    .post("/jobs")
    .send(newJob)
    .set("authorization", `Bearer ${u2Token}`);
    const resp = await request(app)
        .patch(`/jobs/${job.body.job.id}`)
        .send({
          id: 12
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on company change attempt", async function () {
    const job = await request(app)
    .post("/jobs")
    .send(newJob)
    .set("authorization", `Bearer ${u2Token}`);
    const resp = await request(app)
        .patch(`/jobs/${job.body.job.id}`)
        .send({
          companyHandle: "c3"
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request on invalid data", async function () {
    const job = await request(app)
    .post("/jobs")
    .send(newJob)
    .set("authorization", `Bearer ${u2Token}`);
    const resp = await request(app)
        .patch(`/jobs/${job.body.job.id}`)
        .send({
          logoUrl: "not-a-url"
        })
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admin", async function () {
    const job = await request(app)
    .post("/jobs")
    .send(newJob)
    .set("authorization", `Bearer ${u2Token}`);
    const resp = await request(app)
        .delete(`/jobs/${job.body.job.id}`)
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.body).toEqual({ deleted: `${job.body.job.id}` });
  });

  test("unauth for anon", async function () {
    const job = await request(app)
    .post("/jobs")
    .send(newJob)
    .set("authorization", `Bearer ${u2Token}`);
    const resp = await request(app)
        .delete(`/jobs/${job.body.job.id}`)
    expect(resp.statusCode).toEqual(401);
    });

  test("unauth for non admin user", async function () {
    const job = await request(app)
    .post("/jobs")
    .send(newJob)
    .set("authorization", `Bearer ${u2Token}`);
    const resp = await request(app)
        .delete(`/jobs/${job.body.job.id}`)
        .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    });

  test("not found for no such job", async function () {
    const resp = await request(app)
        .delete(`/jobs/999999999`)
        .set("authorization", `Bearer ${u2Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
