// ----------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.  All rights reserved.
// ----------------------------------------------------------------------------

// tslint:disable:no-unused-expression max-func-body-length promise-function-async max-line-length insecure-random
// tslint:disable:object-literal-key-quotes no-function-expression no-non-null-assertion

import * as assert from "assert";
import { randomBytes } from "crypto";
import { ISuiteCallbackContext, ITestCallbackContext } from "mocha";
import { DeploymentTemplate, Histogram, IncorrectArgumentsCountIssue, Json, Language, ParameterDefinition, Reference, ReferenceInVariableDefinitionJSONVisitor, UnrecognizedFunctionIssue } from "../extension.bundle";
import { sources, testDiagnostics } from "./support/diagnostics";
import { testWithLanguageServer } from "./support/testWithLanguageServer";

suite("DeploymentTemplate", () => {
    suite("constructor(string)", () => {
        test("Null stringValue", () => {
            // tslint:disable-next-line:no-any
            assert.throws(() => { new DeploymentTemplate(<any>null, "id"); });
        });

        test("Undefined stringValue", () => {
            // tslint:disable-next-line:no-any
            assert.throws(() => { new DeploymentTemplate(<any>undefined, "id"); });
        });

        test("Empty stringValue", () => {
            const dt = new DeploymentTemplate("", "id");
            assert.deepStrictEqual("", dt.documentText);
            assert.deepStrictEqual("id", dt.documentId);
            assert.deepStrictEqual([], dt.parameterDefinitions);
        });

        test("Non-JSON stringValue", () => {
            const dt = new DeploymentTemplate("I'm not a JSON file", "id");
            assert.deepStrictEqual("I'm not a JSON file", dt.documentText);
            assert.deepStrictEqual("id", dt.documentId);
            assert.deepStrictEqual([], dt.parameterDefinitions);
        });

        test("JSON stringValue with number parameters definition", () => {
            const dt = new DeploymentTemplate("{ 'parameters': 21 }", "id");
            assert.deepStrictEqual("{ 'parameters': 21 }", dt.documentText);
            assert.deepStrictEqual("id", dt.documentId);
            assert.deepStrictEqual([], dt.parameterDefinitions);
        });

        test("JSON stringValue with empty object parameters definition", () => {
            const dt = new DeploymentTemplate("{ 'parameters': {} }", "id");
            assert.deepStrictEqual("{ 'parameters': {} }", dt.documentText);
            assert.deepStrictEqual("id", dt.documentId);
            assert.deepStrictEqual([], dt.parameterDefinitions);
        });

        test("JSON stringValue with one parameter definition", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'num': { 'type': 'number' } } }", "id");
            assert.deepStrictEqual("{ 'parameters': { 'num': { 'type': 'number' } } }", dt.documentText);
            assert.deepStrictEqual("id", dt.documentId);
            const parameterDefinitions: ParameterDefinition[] = dt.parameterDefinitions;
            assert(parameterDefinitions);
            assert.deepStrictEqual(parameterDefinitions.length, 1);
            const pd0: ParameterDefinition = parameterDefinitions[0];
            assert(pd0);
            assert.deepStrictEqual(pd0.name.toString(), "num");
            assert.deepStrictEqual(pd0.description, null);
            assert.deepStrictEqual(pd0.span, new Language.Span(18, 27));
        });

        test("JSON stringValue with one parameter definition with null description", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'num': { 'type': 'number', 'metadata': { 'description': null } } } }", "id");
            assert.deepStrictEqual("id", dt.documentId);
            const parameterDefinitions: ParameterDefinition[] = dt.parameterDefinitions;
            assert(parameterDefinitions);
            assert.deepStrictEqual(parameterDefinitions.length, 1);
            const pd0: ParameterDefinition = parameterDefinitions[0];
            assert(pd0);
            assert.deepStrictEqual(pd0.name.toString(), "num");
            assert.deepStrictEqual(pd0.description, null);
            assert.deepStrictEqual(pd0.span, new Language.Span(18, 64));
        });

        test("JSON stringValue with one parameter definition with empty description", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'num': { 'type': 'number', 'metadata': { 'description': '' } } } }", "id");
            assert.deepStrictEqual("id", dt.documentId);
            const parameterDefinitions: ParameterDefinition[] = dt.parameterDefinitions;
            assert(parameterDefinitions);
            assert.deepStrictEqual(parameterDefinitions.length, 1);
            const pd0: ParameterDefinition = parameterDefinitions[0];
            assert(pd0);
            assert.deepStrictEqual(pd0.name.toString(), "num");
            assert.deepStrictEqual(pd0.description, "");
            assert.deepStrictEqual(pd0.span, new Language.Span(18, 62));
        });

        test("JSON stringValue with one parameter definition with non-empty description", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'num': { 'type': 'number', 'metadata': { 'description': 'num description' } } } }", "id");
            assert.deepStrictEqual("id", dt.documentId);
            const parameterDefinitions: ParameterDefinition[] = dt.parameterDefinitions;
            assert(parameterDefinitions);
            assert.deepStrictEqual(parameterDefinitions.length, 1);
            const pd0: ParameterDefinition = parameterDefinitions[0];
            assert(pd0);
            assert.deepStrictEqual(pd0.name.toString(), "num");
            assert.deepStrictEqual(pd0.description, "num description");
            assert.deepStrictEqual(pd0.span, new Language.Span(18, 77));
        });

        test("JSON stringValue with number variable definitions", () => {
            const dt = new DeploymentTemplate("{ 'variables': 12 }", "id");
            assert.deepStrictEqual("id", dt.documentId);
            assert.deepStrictEqual("{ 'variables': 12 }", dt.documentText);
            assert.deepStrictEqual([], dt.variableDefinitions);
        });

        test("JSON stringValue with one variable definition", () => {
            const dt: DeploymentTemplate = new DeploymentTemplate("{ 'variables': { 'a': 'A' } }", "id");
            assert.deepStrictEqual(dt.documentId, "id");
            assert.deepStrictEqual(dt.documentText, "{ 'variables': { 'a': 'A' } }");
            assert.deepStrictEqual(dt.variableDefinitions.length, 1);
            assert.deepStrictEqual(dt.variableDefinitions[0].name.toString(), "a");

            const variableDefinition: Json.StringValue | null = Json.asStringValue(dt.variableDefinitions[0].value);
            if (!variableDefinition) { throw new Error("failed"); }
            assert.deepStrictEqual(variableDefinition.span, new Language.Span(22, 3));
            assert.deepStrictEqual(variableDefinition.toString(), "A");
        });

        test("JSON stringValue with two variable definitions", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'a': 'A', 'b': 2 } }", "id");
            assert.deepStrictEqual("id", dt.documentId);
            assert.deepStrictEqual("{ 'variables': { 'a': 'A', 'b': 2 } }", dt.documentText);
            assert.deepStrictEqual(dt.variableDefinitions.length, 2);

            assert.deepStrictEqual(dt.variableDefinitions[0].name.toString(), "a");
            const a: Json.StringValue | null = Json.asStringValue(dt.variableDefinitions[0].value);
            if (!a) { throw new Error("failed"); }
            assert.deepStrictEqual(a.span, new Language.Span(22, 3));
            assert.deepStrictEqual(a.toString(), "A");

            assert.deepStrictEqual(dt.variableDefinitions[1].name.toString(), "b");
            const b: Json.NumberValue | null = Json.asNumberValue(dt.variableDefinitions[1].value);
            if (!b) { throw new Error("failed"); }
            assert.deepStrictEqual(b.span, new Language.Span(32, 1));
        });
    });

    suite("errors", () => {
        test("with empty deployment template", () => {
            const dt = new DeploymentTemplate("", "id");
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(errors, []);
            });
        });

        test("with empty object deployment template", () => {
            const dt = new DeploymentTemplate("{}", "id");
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(errors, []);
            });
        });

        test("with one property deployment template", () => {
            const dt = new DeploymentTemplate("{ 'name': 'value' }", "id");
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(errors, []);
            });
        });

        test("with one TLE parse error deployment template", () => {
            const dt = new DeploymentTemplate("{ 'name': '[concat()' }", "id");
            const expectedErrors = [
                new Language.Issue(new Language.Span(20, 1), "Expected a right square bracket (']').")
            ];
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(errors, expectedErrors);
            });
        });

        test("with one undefined parameter error deployment template", () => {
            const dt = new DeploymentTemplate("{ 'name': '[parameters(\"test\")]' }", "id");
            const expectedErrors = [
                new Language.Issue(new Language.Span(23, 6), "Undefined parameter reference: \"test\"")
            ];
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(errors, expectedErrors);
            });
        });

        test("with one undefined variable error deployment template", () => {
            const dt = new DeploymentTemplate("{ 'name': '[variables(\"test\")]' }", "id");
            const expectedErrors = [
                new Language.Issue(new Language.Span(22, 6), "Undefined variable reference: \"test\"")
            ];
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(errors, expectedErrors);
            });
        });

        test("with one unrecognized function error deployment template", () => {
            const dt = new DeploymentTemplate("{ 'name': '[blah(\"test\")]' }", "id");
            const expectedErrors = [
                new UnrecognizedFunctionIssue(new Language.Span(12, 4), "blah")
            ];
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(errors, expectedErrors);
            });
        });

        test("with reference() call in variable definition", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": "[reference('test')]" } }`, "id");
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(
                    errors,
                    [new Language.Issue(new Language.Span(24, 9), "reference() cannot be invoked inside of a variable definition.")]
                );
            });
        });

        test("with reference() call inside a different expression in a variable definition", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": "[concat(reference('test'))]" } }`, "id");
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(
                    errors,
                    [new Language.Issue(new Language.Span(31, 9), "reference() cannot be invoked inside of a variable definition.")]);
            });
        });

        test("with unnamed property access on variable reference", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": {} }, "z": "[variables('a').]" }`, "id");
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(
                    errors,
                    [new Language.Issue(new Language.Span(50, 1), "Expected a literal value.")]);
            });
        });

        test("with property access on variable reference without variable name", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": {} }, "z": "[variables().b]" }`, "id");
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(
                    errors,
                    [new IncorrectArgumentsCountIssue(new Language.Span(35, 11), "The function 'variables' takes 1 argument.", "variables", 0, 1, 1)]);
            });
        });

        test("with property access on string variable reference", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": "A" }, "z": "[variables('a').b]" }`, "id");
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(
                    errors,
                    [new Language.Issue(new Language.Span(51, 1), `Property "b" is not a defined property of "variables('a')".`)]);
            });
        });

        test("with undefined variable reference child property", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": {} }, "z": "[variables('a').b]" }`, "id");
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(
                    errors,
                    [new Language.Issue(new Language.Span(50, 1), `Property "b" is not a defined property of "variables('a')".`)]);
            });
        });

        test("with undefined variable reference grandchild property", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": { "b": {} } }, "z": "[variables('a').b.c]" }`, "id");
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(
                    errors,
                    [new Language.Issue(new Language.Span(61, 1), `Property "c" is not a defined property of "variables('a').b".`)]);
            });
        });

        test("with undefined variable reference child and grandchild properties", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": { "d": {} } }, "z": "[variables('a').b.c]" }`, "id");
            return dt.errors.then((errors: Language.Issue[]) => {
                assert.deepStrictEqual(
                    errors,
                    [new Language.Issue(new Language.Span(59, 1), `Property "b" is not a defined property of "variables('a')".`)]);
            });
        });
    });

    suite("warnings", () => {
        test("with unused parameter", () => {
            const dt = new DeploymentTemplate(`{ "parameters": { "a": {} } }`, "id");
            assert.deepStrictEqual(
                dt.warnings,
                [new Language.Issue(new Language.Span(18, 3), "The parameter 'a' is never used.")]);
        });

        test("with no unused parameters", () => {
            const dt = new DeploymentTemplate(`{ "parameters": { "a": {} }, "b": "[parameters('a')] }`, "id");
            assert.deepStrictEqual(dt.warnings, []);
            assert.deepStrictEqual(dt.warnings, []);
        });

        test("with unused variable", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": "A" } }`, "id");
            assert.deepStrictEqual(
                dt.warnings,
                [new Language.Issue(new Language.Span(17, 3), "The variable 'a' is never used.")]);
        });

        test("with no unused variables", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": "A" }, "b": "[variables('a')] }`, "id");
            assert.deepStrictEqual(dt.warnings, []);
            assert.deepStrictEqual(dt.warnings, []);
        });
    });

    suite("get functionCounts()", () => {
        test("with empty deployment template", () => {
            const dt = new DeploymentTemplate("", "id");
            const expectedHistogram = new Histogram();
            assert.deepStrictEqual(expectedHistogram, dt.functionCounts);
            assert.deepStrictEqual(expectedHistogram, dt.functionCounts);
        });

        test("with empty object deployment template", () => {
            const dt = new DeploymentTemplate("{}", "id");
            const expectedHistogram = new Histogram();
            assert.deepStrictEqual(expectedHistogram, dt.functionCounts);
            assert.deepStrictEqual(expectedHistogram, dt.functionCounts);
        });

        test("with one property object deployment template", () => {
            const dt = new DeploymentTemplate("{ 'name': 'value' }", "id");
            const expectedHistogram = new Histogram();
            assert.deepStrictEqual(expectedHistogram, dt.functionCounts);
            assert.deepStrictEqual(expectedHistogram, dt.functionCounts);
        });

        test("with one TLE function used multiple times in deployment template", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'name': '[concat()]', 'name2': '[concat(1, 2)]', 'name3': '[concat(2, 3)]' } }", "id");
            const expectedHistogram = new Histogram();
            expectedHistogram.add("concat");
            expectedHistogram.add("concat");
            expectedHistogram.add("concat");
            expectedHistogram.add("concat(0)");
            expectedHistogram.add("concat(2)");
            expectedHistogram.add("concat(2)");
            assert.deepStrictEqual(expectedHistogram, dt.functionCounts);
            assert.deepStrictEqual(expectedHistogram, dt.functionCounts);
        });

        test("with two TLE functions in different TLEs deployment template", () => {
            const dt = new DeploymentTemplate("{ 'name': '[concat()]', 'height': '[add()]' }", "id");
            const expectedHistogram = new Histogram();
            expectedHistogram.add("concat");
            expectedHistogram.add("concat(0)");
            expectedHistogram.add("add");
            expectedHistogram.add("add(0)");
            assert.deepStrictEqual(expectedHistogram, dt.functionCounts);
            assert.deepStrictEqual(expectedHistogram, dt.functionCounts);
        });
    });

    suite("get jsonParseResult()", () => {
        test("with empty deployment template", () => {
            const dt = new DeploymentTemplate("", "id");
            assert(dt.jsonParseResult);
            assert.equal(0, dt.jsonParseResult.tokenCount);
        });

        test("with empty object deployment template", () => {
            const dt = new DeploymentTemplate("{}", "id");
            assert(dt.jsonParseResult);
            assert.equal(2, dt.jsonParseResult.tokenCount);
        });
    });

    suite("get parameterDefinitions()", () => {
        test("with no parameters property", () => {
            const dt = new DeploymentTemplate("{}", "id");
            assert.deepStrictEqual(dt.parameterDefinitions, []);
        });

        test("with null parameters property", () => {
            const dt = new DeploymentTemplate("{ 'parameters': null }", "id");
            assert.deepStrictEqual(dt.parameterDefinitions, []);
        });

        test("with string parameters property", () => {
            const dt = new DeploymentTemplate("{ 'parameters': 'hello' }", "id");
            assert.deepStrictEqual(dt.parameterDefinitions, []);
        });

        test("with number parameters property", () => {
            const dt = new DeploymentTemplate("{ 'parameters': 1 }", "id");
            assert.deepStrictEqual(dt.parameterDefinitions, []);
        });

        test("with empty object parameters property", () => {
            const dt = new DeploymentTemplate("{ 'parameters': {} }", "id");
            assert.deepStrictEqual(dt.parameterDefinitions, []);
        });

        test("with empty object parameter", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'a': {} } }", "id");
            const parameterDefinitions: ParameterDefinition[] = dt.parameterDefinitions;
            assert(parameterDefinitions);
            assert.deepStrictEqual(parameterDefinitions.length, 1);
            const pd0: ParameterDefinition = parameterDefinitions[0];
            assert(pd0);
            assert.deepStrictEqual(pd0.name.toString(), "a");
            assert.deepStrictEqual(pd0.description, null);
            assert.deepStrictEqual(pd0.span, new Language.Span(18, 7));
        });

        test("with parameter with metadata but no description", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'a': { 'metadata': {} } } }", "id");
            const parameterDefinitions: ParameterDefinition[] = dt.parameterDefinitions;
            assert(parameterDefinitions);
            assert.deepStrictEqual(parameterDefinitions.length, 1);
            const pd0: ParameterDefinition = parameterDefinitions[0];
            assert(pd0);
            assert.deepStrictEqual(pd0.name.toString(), "a");
            assert.deepStrictEqual(pd0.description, null);
            assert.deepStrictEqual(pd0.span, new Language.Span(18, 23));
        });

        test("with parameter with metadata and description", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'a': { 'metadata': { 'description': 'b' } } } }", "id");
            const parameterDefinitions: ParameterDefinition[] = dt.parameterDefinitions;
            assert(parameterDefinitions);
            assert.deepStrictEqual(parameterDefinitions.length, 1);
            const pd0: ParameterDefinition = parameterDefinitions[0];
            assert(pd0);
            assert.deepStrictEqual(pd0.name.toString(), "a");
            assert.deepStrictEqual(pd0.description, "b");
            assert.deepStrictEqual(pd0.span, new Language.Span(18, 43));
        });
    });

    suite("getParameterDefinition(string)", () => {
        test("with null", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");
            // tslint:disable-next-line:no-any
            assert.throws(() => { dt.getParameterDefinition(<any>null); });
        });

        test("with undefined", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");
            // tslint:disable-next-line:no-any
            assert.throws(() => { dt.getParameterDefinition(<any>undefined); });
        });

        test("with empty", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");
            assert.throws(() => { dt.getParameterDefinition(""); });
        });

        test("with no parameters definition", () => {
            const dt = new DeploymentTemplate("{}", "id");
            assert.deepStrictEqual(null, dt.getParameterDefinition("spam"));
        });

        test("with unquoted non-match", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");
            assert.deepStrictEqual(null, dt.getParameterDefinition("spam"));
        });

        test("with one-sided-quote non-match", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");
            assert.deepStrictEqual(null, dt.getParameterDefinition("'spam"));
        });

        test("with quoted non-match", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");
            assert.deepStrictEqual(null, dt.getParameterDefinition("'spam'"));
        });

        test("with unquoted match", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");
            const apples: ParameterDefinition | null = dt.getParameterDefinition("apples");
            if (!apples) { throw new Error("failed"); }
            assert.deepStrictEqual(apples.name.toString(), "apples");
            assert.deepStrictEqual(apples.description, null);
            assert.deepStrictEqual(apples.span, new Language.Span(18, 30));
            assert.deepStrictEqual(apples.name.span, new Language.Span(18, 8), "Wrong name.span");
            assert.deepStrictEqual(apples.name.unquotedSpan, new Language.Span(19, 6), "Wrong name.unquotedSpan");
        });

        test("with one-sided-quote match", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");
            const apples: ParameterDefinition | null = dt.getParameterDefinition("'apples");
            if (!apples) { throw new Error("failed"); }
            assert.deepStrictEqual(apples.name.toString(), "apples");
            assert.deepStrictEqual(apples.description, null);
            assert.deepStrictEqual(apples.span, new Language.Span(18, 30));
        });

        test("with quoted match", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");
            const apples: ParameterDefinition | null = dt.getParameterDefinition("'apples'");
            if (!apples) { throw new Error("failed"); }
            assert.deepStrictEqual(apples.name.toString(), "apples");
            assert.deepStrictEqual(apples.description, null);
            assert.deepStrictEqual(apples.span, new Language.Span(18, 30));
        });

        test("with case insensitive match", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");
            const apples: ParameterDefinition | null = dt.getParameterDefinition("'APPLES'");
            if (!apples) { throw new Error("failed"); }
            assert.deepStrictEqual(apples.name.toString(), "apples");
            assert.deepStrictEqual(apples.description, null);
            assert.deepStrictEqual(apples.span, new Language.Span(18, 30));
        });

        test("with case sensitive and insensitive match", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'APPLES': { 'type': 'integer' } } }", "id");
            const APPLES: ParameterDefinition | null = dt.getParameterDefinition("'APPLES'");
            if (!APPLES) { throw new Error("failed"); }
            assert.deepStrictEqual(APPLES.name.toString(), "APPLES");
            assert.deepStrictEqual(APPLES.description, null);
            assert.deepStrictEqual(APPLES.span, new Language.Span(50, 31));

            const apples: ParameterDefinition | null = dt.getParameterDefinition("'APPles'");
            if (!apples) { throw new Error("failed"); }
            assert.deepStrictEqual(apples.name.toString(), "apples");
            assert.deepStrictEqual(apples.description, null);
            assert.deepStrictEqual(apples.span, new Language.Span(18, 30));
        });
    });

    suite("findParameterDefinitionsWithPrefix(string)", () => {
        test("with null", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");
            // tslint:disable-next-line:no-any
            assert.throws(() => { dt.findParameterDefinitionsWithPrefix(<any>null); });
        });

        test("with undefined", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");
            // tslint:disable-next-line:no-any
            assert.throws(() => { dt.findParameterDefinitionsWithPrefix(<any>undefined); });
        });

        test("with empty", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");

            const matches: ParameterDefinition[] = dt.findParameterDefinitionsWithPrefix("");
            assert(matches);
            assert.deepStrictEqual(matches.length, 2);

            const match0: ParameterDefinition = matches[0];
            assert(match0);
            assert.deepStrictEqual(match0.name.toString(), "apples");
            assert.deepStrictEqual(match0.description, null);
            assert.deepStrictEqual(match0.span, new Language.Span(18, 30));

            const match1: ParameterDefinition = matches[1];
            assert(match1);
            assert.deepStrictEqual(match1.name.toString(), "bananas");
            assert.deepStrictEqual(match1.description, null);
            assert.deepStrictEqual(match1.span, new Language.Span(50, 32));
        });

        test("with prefix of one of the parameters", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");

            const matches: ParameterDefinition[] = dt.findParameterDefinitionsWithPrefix("ap");
            assert(matches);
            assert.deepStrictEqual(matches.length, 1);

            const match0: ParameterDefinition = matches[0];
            assert(match0);
            assert.deepStrictEqual(match0.name.toString(), "apples");
            assert.deepStrictEqual(match0.description, null);
            assert.deepStrictEqual(match0.span, new Language.Span(18, 30));
        });

        test("with prefix of none of the parameters", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");
            assert.deepStrictEqual(dt.findParameterDefinitionsWithPrefix("ca"), []);
        });

        test("with case insensitive match", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'bananas': { 'type': 'integer' } } }", "id");

            const matches: ParameterDefinition[] = dt.findParameterDefinitionsWithPrefix("APP");
            assert(matches);
            assert.deepStrictEqual(matches.length, 1);

            const match0: ParameterDefinition = matches[0];
            assert(match0);
            assert.deepStrictEqual(match0.name.toString(), "apples");
            assert.deepStrictEqual(match0.description, null);
            assert.deepStrictEqual(match0.span, new Language.Span(18, 30));
        });

        test("with case sensitive and insensitive match", () => {
            const dt = new DeploymentTemplate("{ 'parameters': { 'apples': { 'type': 'string' }, 'APPLES': { 'type': 'integer' } } }", "id");

            const matches: ParameterDefinition[] = dt.findParameterDefinitionsWithPrefix("APP");
            assert(matches);
            assert.deepStrictEqual(matches.length, 2);

            const match0: ParameterDefinition = matches[0];
            assert(match0);
            assert.deepStrictEqual(match0.name.toString(), "apples");
            assert.deepStrictEqual(match0.description, null);
            assert.deepStrictEqual(match0.span, new Language.Span(18, 30));

            const match1: ParameterDefinition = matches[1];
            assert(match1);
            assert.deepStrictEqual(match1.name.toString(), "APPLES");
            assert.deepStrictEqual(match1.description, null);
            assert.deepStrictEqual(match1.span, new Language.Span(50, 31));
        });
    });

    suite("getVariableDefinition(string)", () => {
        test("with null", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'yum', 'bananas': 'good' } }", "id");
            // tslint:disable-next-line:no-any
            assert.throws(() => { dt.getVariableDefinition(<any>null); });
        });

        test("with undefined", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'yum', 'bananas': 'good' } }", "id");
            // tslint:disable-next-line:no-any
            assert.throws(() => { dt.getVariableDefinition(<any>undefined); });
        });

        test("with empty", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'yum', 'bananas': 'good' } }", "id");
            assert.throws(() => { dt.getVariableDefinition(""); });
        });

        test("with no variables definition", () => {
            const dt = new DeploymentTemplate("{}", "id");
            assert.deepStrictEqual(null, dt.getVariableDefinition("spam"));
        });

        test("with unquoted non-match", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'yum', 'bananas': 'good' } }", "id");
            assert.deepStrictEqual(null, dt.getVariableDefinition("spam"));
        });

        test("with one-sided-quote non-match", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'yum', 'bananas': 'good' } }", "id");
            assert.deepStrictEqual(null, dt.getVariableDefinition("'spam"));
        });

        test("with quoted non-match", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'yum', 'bananas': 'good' } }", "id");
            assert.deepStrictEqual(null, dt.getVariableDefinition("'spam'"));
        });

        test("with unquoted match", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'yum', 'bananas': 'good' } }", "id");

            const apples: Json.Property | null = dt.getVariableDefinition("apples");
            if (!apples) { throw new Error("failed"); }
            assert.deepStrictEqual(apples.name.toString(), "apples");

            const value: Json.Value | null = Json.asStringValue(apples.value);
            if (!value) { throw new Error("failed"); }
            assert.deepStrictEqual(value.span, new Language.Span(27, 5));
            assert.deepStrictEqual(value.toString(), "yum");
        });

        test("with one-sided-quote match", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'yum', 'bananas': 'good' } }", "id");

            const apples: Json.Property | null = dt.getVariableDefinition("'apples");
            if (!apples) { throw new Error("failed"); }
            assert.deepStrictEqual(apples.name.toString(), "apples");

            const value: Json.StringValue | null = Json.asStringValue(apples.value);
            if (!value) { throw new Error("failed"); }
            assert.deepStrictEqual(value.span, new Language.Span(27, 5));
            assert.deepStrictEqual(value.toString(), "yum");
        });

        test("with quoted match", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'yum', 'bananas': 'good' } }", "id");

            const apples: Json.Property | null = dt.getVariableDefinition("'apples'");
            if (!apples) { throw new Error("failed"); }
            assert.deepStrictEqual(apples.name.toString(), "apples");

            const value: Json.StringValue | null = Json.asStringValue(apples.value);
            if (!value) { throw new Error("failed"); }
            assert.deepStrictEqual(value.span, new Language.Span(27, 5));
            assert.deepStrictEqual(value.toString(), "yum");
        });

        test("with case insensitive match", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'yum', 'bananas': 'good' } }", "id");

            const apples: Json.Property | null = dt.getVariableDefinition("'APPLES");
            if (!apples) { throw new Error("failed"); }
            assert.deepStrictEqual(apples.name.toString(), "apples");

            const value: Json.StringValue | null = Json.asStringValue(apples.value);
            if (!value) { throw new Error("failed"); }
            assert.deepStrictEqual(value.span, new Language.Span(27, 5));
            assert.deepStrictEqual(value.toString(), "yum");
        });

        test("with case sensitive and insensitive match", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'yum', 'APPLES': 'good' } }", "id");

            const APPLES: Json.Property | null = dt.getVariableDefinition("'APPLES'");
            if (!APPLES) { throw new Error("failed"); }
            assert.deepStrictEqual(APPLES.name.toString(), "APPLES");

            const applesValue: Json.StringValue | null = Json.asStringValue(APPLES.value);
            if (!applesValue) { throw new Error("failed"); }
            assert.deepStrictEqual(applesValue.span, new Language.Span(44, 6));
            assert.deepStrictEqual(applesValue.toString(), "good");

            const apples: Json.Property | null = dt.getVariableDefinition("'APPles'");
            if (!apples) { throw new Error("failed"); }
            assert.deepStrictEqual(apples.name.toString(), "apples");

            const value: Json.StringValue | null = Json.asStringValue(apples.value);
            if (!value) { throw new Error("failed"); }
            assert.deepStrictEqual(value.span, new Language.Span(27, 5));
            assert.deepStrictEqual(value.toString(), "yum");
        });
    });

    suite("findVariableDefinitionsWithPrefix(string)", () => {
        test("with null", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'APPLES', 'bananas': 88 } }", "id");
            // tslint:disable-next-line:no-any
            assert.throws(() => { dt.findVariableDefinitionsWithPrefix(<any>null); });
        });

        test("with undefined", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'APPLES', 'bananas': 88 } }", "id");
            // tslint:disable-next-line:no-any
            assert.throws(() => { dt.findVariableDefinitionsWithPrefix(<any>undefined); });
        });

        test("with empty", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'APPLES', 'bananas': 88 } }", "id");

            const definitions: Json.Property[] = dt.findVariableDefinitionsWithPrefix("");
            assert.deepStrictEqual(definitions.length, 2);

            const apples: Json.Property = definitions[0];
            assert.deepStrictEqual(apples.name.toString(), "apples");
            const applesValue: Json.StringValue | null = Json.asStringValue(apples.value);
            if (!applesValue) { throw new Error("failed"); }
            assert.deepStrictEqual(applesValue.span, new Language.Span(27, 8));
            assert.deepStrictEqual(applesValue.toString(), "APPLES");

            const bananas: Json.Property = definitions[1];
            assert.deepStrictEqual(bananas.name.toString(), "bananas");
            const bananasValue: Json.NumberValue | null = Json.asNumberValue(bananas.value);
            assert.deepStrictEqual(bananasValue!.span, new Language.Span(48, 2));
        });

        test("with prefix of one of the variables", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'APPLES', 'bananas': 88 } }", "id");

            const definitions: Json.Property[] = dt.findVariableDefinitionsWithPrefix("ap");
            assert.deepStrictEqual(definitions.length, 1);

            const apples: Json.Property = definitions[0];
            assert.deepStrictEqual(apples.name.toString(), "apples");
            const applesValue: Json.StringValue | null = Json.asStringValue(apples.value);
            if (!applesValue) { throw new Error("failed"); }
            assert.deepStrictEqual(applesValue.span, new Language.Span(27, 8));
            assert.deepStrictEqual(applesValue.toString(), "APPLES");
        });

        test("with prefix of none of the variables", () => {
            const dt = new DeploymentTemplate("{ 'variables': { 'apples': 'APPLES', 'bananas': 88 } }", "id");
            assert.deepStrictEqual([], dt.findVariableDefinitionsWithPrefix("ca"));
        });
    });

    suite("getContextFromDocumentLineAndColumnIndexes(number, number)", () => {
        test("with empty deployment template", () => {
            const dt = new DeploymentTemplate("", "id");
            const context = dt.getContextFromDocumentLineAndColumnIndexes(0, 0);
            assert(context);
            assert.equal(0, context.documentLineIndex);
            assert.equal(0, context.documentColumnIndex);
            assert.equal(0, context.documentCharacterIndex);
        });
    });

    suite("findReferences(Reference.Type, string)", () => {
        test("with null type", () => {
            const dt = new DeploymentTemplate("", "id");
            // tslint:disable-next-line:no-any
            assert.throws(() => { dt.findReferences(<any>null, "rName"); });
        });

        test("with undefined type", () => {
            const dt = new DeploymentTemplate("", "id");
            // tslint:disable-next-line:no-any
            assert.throws(() => { dt.findReferences(<any>undefined, "rName"); });
        });

        test("with null name", () => {
            const dt = new DeploymentTemplate("", "id");
            // tslint:disable-next-line:no-any
            const list: Reference.List = dt.findReferences(Reference.ReferenceKind.Parameter, <any>null);
            assert(list);
            assert.deepStrictEqual(list.kind, Reference.ReferenceKind.Parameter);
            assert.deepStrictEqual(list.spans, []);
        });

        test("with undefined name", () => {
            const dt = new DeploymentTemplate("", "id");
            // tslint:disable-next-line:no-any
            const list: Reference.List = dt.findReferences(Reference.ReferenceKind.Parameter, <any>undefined);
            assert(list);
            assert.deepStrictEqual(list.kind, Reference.ReferenceKind.Parameter);
            assert.deepStrictEqual(list.spans, []);
        });

        test("with empty name", () => {
            const dt = new DeploymentTemplate("", "id");
            const list: Reference.List = dt.findReferences(Reference.ReferenceKind.Parameter, "");
            assert(list);
            assert.deepStrictEqual(list.kind, Reference.ReferenceKind.Parameter);
            assert.deepStrictEqual(list.spans, []);
        });

        test("with parameter type and no matching parameter definition", () => {
            const dt = new DeploymentTemplate(`{ "parameters": { "pName": {} } }`, "id");
            const list: Reference.List = dt.findReferences(Reference.ReferenceKind.Parameter, "dontMatchMe");
            assert(list);
            assert.deepStrictEqual(list.kind, Reference.ReferenceKind.Parameter);
            assert.deepStrictEqual(list.spans, []);
        });

        test("with parameter type and matching parameter definition", () => {
            const dt = new DeploymentTemplate(`{ "parameters": { "pName": {} } }`, "id");
            const list: Reference.List = dt.findReferences(Reference.ReferenceKind.Parameter, "pName");
            assert(list);
            assert.deepStrictEqual(list.kind, Reference.ReferenceKind.Parameter);
            assert.deepStrictEqual(list.spans, [new Language.Span(19, 5)]);
        });

        test("with variable type and no matching variable definition", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "vName": {} } }`, "id");
            const list: Reference.List = dt.findReferences(Reference.ReferenceKind.Variable, "dontMatchMe");
            assert(list);
            assert.deepStrictEqual(list.kind, Reference.ReferenceKind.Variable);
            assert.deepStrictEqual(list.spans, []);
        });

        test("with variable type and matching variable definition", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "vName": {} } }`, "id");
            const list: Reference.List = dt.findReferences(Reference.ReferenceKind.Variable, "vName");
            assert(list);
            assert.deepStrictEqual(list.kind, Reference.ReferenceKind.Variable);
            assert.deepStrictEqual(list.spans, [new Language.Span(18, 5)]);
        });
    });
});

suite("ReferenceInVariableDefinitionJSONVisitor", () => {
    suite("constructor(DeploymentTemplate)", () => {
        test("with null", () => {
            // tslint:disable-next-line:no-any
            assert.throws(() => { new ReferenceInVariableDefinitionJSONVisitor(<any>null); });
        });

        test("with undefined", () => {
            // tslint:disable-next-line:no-any
            assert.throws(() => { new ReferenceInVariableDefinitionJSONVisitor(<any>undefined); });
        });

        test("with deploymentTemplate", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": "[reference('test')]" } }`, "id");
            const visitor = new ReferenceInVariableDefinitionJSONVisitor(dt);
            assert.deepStrictEqual(visitor.referenceSpans, []);
        });

        testWithLanguageServer("expecting error: reference in variable definition", async function (this: ITestCallbackContext): Promise<void> {
            await testDiagnostics(
                {
                    "variables": {
                        "a": "[reference('test')]"
                    },
                },
                {
                    includeSources: [sources.expressions]
                },
                [
                    "Error: reference() cannot be invoked inside of a variable definition. (arm-template (expr))",
                    "Warning: The variable 'a' is never used. (arm-template (expr))"
                ]);
        });
    });

    suite("visitStringValue(Json.StringValue)", () => {
        test("with null", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": "[reference('test')]" } }`, "id");
            const visitor = new ReferenceInVariableDefinitionJSONVisitor(dt);
            // tslint:disable-next-line:no-any
            assert.throws(() => { visitor.visitStringValue(<any>null); });
        });

        test("with undefined", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": "[reference('test')]" } }`, "id");
            const visitor = new ReferenceInVariableDefinitionJSONVisitor(dt);
            // tslint:disable-next-line:no-any
            assert.throws(() => { visitor.visitStringValue(<any>undefined); });
        });

        test("with non-TLE string", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": "[reference('test')]" } }`, "id");
            const visitor = new ReferenceInVariableDefinitionJSONVisitor(dt);
            const variables: Json.StringValue = Json.asObjectValue(dt.jsonParseResult.value)!.properties[0].name;
            visitor.visitStringValue(variables);
            assert.deepStrictEqual(visitor.referenceSpans, []);
        });

        test("with TLE string with reference() call", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": "[reference('test')]" } }`, "id");
            const visitor = new ReferenceInVariableDefinitionJSONVisitor(dt);
            const dtObject: Json.ObjectValue | null = Json.asObjectValue(dt.jsonParseResult.value);
            const variablesObject: Json.ObjectValue | null = Json.asObjectValue(dtObject!.getPropertyValue("variables"));
            const tle: Json.StringValue | null = Json.asStringValue(variablesObject!.getPropertyValue("a"));

            visitor.visitStringValue(tle!);
            assert.deepStrictEqual(visitor.referenceSpans, [new Language.Span(24, 9)]);
        });

        test("with TLE string with reference() call inside concat() call", () => {
            const dt = new DeploymentTemplate(`{ "variables": { "a": "[concat(reference('test'))]" } }`, "id");
            const visitor = new ReferenceInVariableDefinitionJSONVisitor(dt);
            const dtObject: Json.ObjectValue | null = Json.asObjectValue(dt.jsonParseResult.value);
            const variablesObject: Json.ObjectValue | null = Json.asObjectValue(dtObject!.getPropertyValue("variables"));
            const tle: Json.StringValue | null = Json.asStringValue(variablesObject!.getPropertyValue("a"));

            visitor.visitStringValue(tle!);
            assert.deepStrictEqual(visitor.referenceSpans, [new Language.Span(31, 9)]);
        });
    });
});

suite("Incomplete JSON shouldn't crash parse", function (this: ISuiteCallbackContext): void {
    this.timeout(10000);

    const template: string =
        `{
        "$schema": "http://schema.management.azure.com/schemas/2015-01-01/deploymentTemplate.json#",
        "contentVersion": "1.0.0.0",
        "parameters": {
            "location": { "type": "string" },
            "networkInterfaceName": {
                "type": "string"
            },
        },
        "variables": {
            "vnetId": "[resourceId(resourceGroup().name,'Microsoft.Network/virtualNetworks', parameters('virtualNetworkName'))]",
        },
        "resources": [
            {
                "name": "[parameters('networkInterfaceName')]",
                "type": "Microsoft.Network/networkInterfaces",
                "apiVersion": "2018-10-01",
                "location": "[parameters('location')]",
                "dependsOn": [
                    "[concat('Microsoft.Network/networkSecurityGroups/', parameters('networkSecurityGroupName'))]",
                    "[concat('Microsoft.Network/virtualNetworks/', parameters('virtualNetworkName'))]",
                    "[concat('Microsoft.Network/publicIpAddresses/', parameters('publicIpAddressName'))]"
                ],
                "properties": {
                    "$test-commandToExecute": "[concat('cd /hub*/docker-compose; sudo docker-compose down -t 60; sudo -s source /set_hub_url.sh ', reference(parameters('publicIpName')).dnsSettings.fqdn, ';  sudo docker volume rm ''dockercompose_cert-volume''; sudo docker-compose up')]",
                    "ipConfigurations": [
                        {
                            "name": "ipconfig1",
                            "properties": {
                                "subnet": {
                                    "id": "[variables('subnetRef')]"
                                },
                                "privateIPAllocationMethod": "Dynamic",
                                "publicIpAddress": {
                                    "id": "[resourceId(resourceGroup().name, 'Microsoft.Network/publicIpAddresses', parameters('publicIpAddressName'))]"
                                }
                            }
                        }
                    ]
                },
                "tags": {}
            }
        ],
        "outputs": {
            "adminUsername": {
                "type": "string",
                "value": "[parameters('adminUsername')]"
            }
        }
    }
    `;

    test("https://github.com/Microsoft/vscode-azurearmtools/issues/193", async () => {
        // Just make sure nothing throws
        let modifiedTemplate = template.replace('"type": "string"', '"type": string');
        let dt = new DeploymentTemplate(modifiedTemplate, "id");
        await dt.errors;
    });

    test("typing character by character", async () => {
        // Just make sure nothing throws
        for (let i = 0; i < template.length; ++i) {
            let partialTemplate = template.slice(0, i);
            let dt = new DeploymentTemplate(partialTemplate, "id");
            await dt.errors;
        }
    });

    test("typing backwards character by character", async () => {
        // Just make sure nothing throws
        for (let i = 0; i < template.length; ++i) {
            let partialTemplate = template.slice(i);
            let dt = new DeploymentTemplate(partialTemplate, "id");
            await dt.errors;
        }
    });

    test("Random modifications", async () => {
        // Just make sure nothing throws
        let modifiedTemplate: string = template;

        for (let i = 0; i < 1000; ++i) {
            if (modifiedTemplate.length > 0 && Math.random() < 0.5) {
                // Delete some characters
                let position = Math.random() * (modifiedTemplate.length - 1);
                let length = Math.random() * Math.max(5, modifiedTemplate.length);
                modifiedTemplate = modifiedTemplate.slice(position, position + length);
            } else {
                // Insert some characters
                let position = Math.random() * modifiedTemplate.length;
                let length = Math.random() * 5;
                let s = randomBytes(length).toString();
                modifiedTemplate = modifiedTemplate.slice(0, position) + s + modifiedTemplate.slice(position);
            }

            let dt = new DeploymentTemplate(modifiedTemplate, "id");
            await dt.errors;
        }
    });
});
