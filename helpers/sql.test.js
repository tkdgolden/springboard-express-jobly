const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function () {
    test("works: rename firstName", function () {
        const inputData = { firstName: "Sarah" };
        const sqlFormat = { firstName: "first_name" };
        const { setCols, values } = sqlForPartialUpdate(inputData, sqlFormat);
        expect(setCols).toEqual('"first_name"=$1');
        expect(values).toEqual(["Sarah"]);
    });

    test("works: full list of data", function () {
        const inputData = { 
            firstName: "Sarah", 
            lastName: "Michaels", 
            password: "sarah", 
            email: "email@email.com", 
            isAdmin: true 
        };
        const sqlFormat = {
            firstName: "first_name",
            lastName: "last_name",
            isAdmin: "is_admin"
        };
        const { setCols, values } = sqlForPartialUpdate(inputData, sqlFormat);
        expect(setCols).toEqual('"first_name"=$1, "last_name"=$2, "password"=$3, "email"=$4, "is_admin"=$5');
        expect(values).toEqual(["Sarah", "Michaels", "sarah", "email@email.com", true]);
    });

    test("no data error", function () {
        const inputData = {};
        const sqlFormat = { firstName: "first_name" };
        expect(() => {
            sqlForPartialUpdate(inputData, sqlFormat);
        }).toThrow();
    });

    test("works: sqlFormat not in same order as inputData", function () {
        const inputData = { 
            firstName: "Sarah", 
            lastName: "Michaels", 
            password: "sarah", 
            email: "email@email.com", 
            isAdmin: true 
        };
        const sqlFormat = {
            isAdmin: "is_admin",
            lastName: "last_name",
            firstName: "first_name"
        };
        const { setCols, values } = sqlForPartialUpdate(inputData, sqlFormat);
        expect(setCols).toEqual('"first_name"=$1, "last_name"=$2, "password"=$3, "email"=$4, "is_admin"=$5');
        expect(values).toEqual(["Sarah", "Michaels", "sarah", "email@email.com", true]);
    });
});