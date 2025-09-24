// @ts-check

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { chromium } from "playwright";

const HttpStatusCode = Object.freeze({
    OK: 200,
    BAD_REQUEST: 400,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    INTERNAL_SERVER_ERROR: 500
});

const MimeTypeByExtension = Object.freeze({
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".mp3": "audio/mpeg",
    default: "application/octet-stream"
});

const serverRootDirectory = resolve(process.cwd());
const GLOBAL_RESULT_STORAGE_KEY = "__ALLERGY_WHEEL_TEST_RESULTS__";

/**
 * Custom error for HTTP responses.
 */
class StaticFileRequestError extends Error {
    /**
     * @param {number} statusCode
     * @param {string} message
     */
    constructor(statusCode, message) {
        super(message);
        this.name = "StaticFileRequestError";
        this.statusCode = statusCode;
    }
}

/**
 * Determines the MIME type for the provided path.
 *
 * @param {string} absolutePath
 * @returns {string}
 */
function determineContentType(absolutePath) {
    const extension = extname(absolutePath).toLowerCase();
    return MimeTypeByExtension[extension] ?? MimeTypeByExtension.default;
}

/**
 * Resolves the requested file path and returns its contents.
 *
 * @param {string} rootDirectory
 * @param {string} requestUrl
 * @returns {Promise<{ absolutePath: string, fileContents: Buffer }>}
 */
async function resolveRequestedFile(rootDirectory, requestUrl) {
    const parsedUrl = new URL(requestUrl, "http://127.0.0.1");
    let requestedPathname = decodeURIComponent(parsedUrl.pathname);
    if (requestedPathname.endsWith("/")) {
        requestedPathname = `${requestedPathname}index.html`;
    }
    const sanitizedRelativePath = requestedPathname.replace(/^\/+/, "");
    const candidateAbsolutePath = resolve(rootDirectory, sanitizedRelativePath);
    if (!candidateAbsolutePath.startsWith(rootDirectory)) {
        throw new StaticFileRequestError(
            HttpStatusCode.FORBIDDEN,
            `Access to ${requestedPathname} is not allowed.`
        );
    }

    let fileStatistics;
    try {
        fileStatistics = await stat(candidateAbsolutePath);
    } catch (error) {
        throw new StaticFileRequestError(
            HttpStatusCode.NOT_FOUND,
            `Resource ${requestedPathname} was not found.`
        );
    }

    let finalAbsolutePath = candidateAbsolutePath;
    if (fileStatistics.isDirectory()) {
        finalAbsolutePath = resolve(candidateAbsolutePath, "index.html");
        try {
            fileStatistics = await stat(finalAbsolutePath);
        } catch (error) {
            throw new StaticFileRequestError(
                HttpStatusCode.NOT_FOUND,
                `Resource ${requestedPathname} was not found.`
            );
        }
    }

    if (!fileStatistics.isFile()) {
        throw new StaticFileRequestError(
            HttpStatusCode.NOT_FOUND,
            `Resource ${requestedPathname} was not found.`
        );
    }

    const fileContents = await readFile(finalAbsolutePath);
    return { absolutePath: finalAbsolutePath, fileContents };
}

/**
 * Starts an HTTP server that serves static files from the provided directory.
 *
 * @param {string} rootDirectory
 * @returns {Promise<{ server: import("node:http").Server, port: number }>}
 */
function startStaticServer(rootDirectory) {
    return new Promise((resolveServerStart, rejectServerStart) => {
        const staticServer = createServer(async (request, response) => {
            try {
                if (request.method !== "GET" && request.method !== "HEAD") {
                    throw new StaticFileRequestError(
                        HttpStatusCode.BAD_REQUEST,
                        `Unsupported method ${request.method ?? "UNKNOWN"}.`
                    );
                }
                if (!request.url) {
                    throw new StaticFileRequestError(
                        HttpStatusCode.BAD_REQUEST,
                        "Request URL is required."
                    );
                }

                const { absolutePath, fileContents } = await resolveRequestedFile(
                    rootDirectory,
                    request.url
                );

                const contentType = determineContentType(absolutePath);
                response.writeHead(HttpStatusCode.OK, { "Content-Type": contentType });
                if (request.method === "GET") {
                    response.end(fileContents);
                } else {
                    response.end();
                }
            } catch (error) {
                if (error instanceof StaticFileRequestError) {
                    response.writeHead(error.statusCode, {
                        "Content-Type": "text/plain; charset=utf-8"
                    });
                    response.end(error.message);
                } else {
                    response.writeHead(HttpStatusCode.INTERNAL_SERVER_ERROR, {
                        "Content-Type": "text/plain; charset=utf-8"
                    });
                    response.end("Internal Server Error");
                }
            }
        });

        staticServer.on("error", (error) => {
            rejectServerStart(error);
        });

        staticServer.listen(0, () => {
            const addressInformation = staticServer.address();
            if (addressInformation && typeof addressInformation === "object") {
                resolveServerStart({
                    server: staticServer,
                    port: addressInformation.port
                });
            } else {
                rejectServerStart(new Error("Failed to determine server port."));
            }
        });
    });
}

/**
 * Closes the provided HTTP server.
 *
 * @param {import("node:http").Server} server
 * @returns {Promise<void>}
 */
function stopStaticServer(server) {
    return new Promise((resolveStop, rejectStop) => {
        server.close((error) => {
            if (error) {
                rejectStop(error);
            } else {
                resolveStop();
            }
        });
    });
}

/**
 * Runs the browser-based test suite using Playwright.
 *
 * @returns {Promise<void>}
 */
async function runBrowserTestSuite() {
    const { server, port } = await startStaticServer(serverRootDirectory);
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on("console", (message) => {
        const messageType = message.type().toUpperCase();
        console.info(`[browser ${messageType}] ${message.text()}`);
    });
    page.on("pageerror", (error) => {
        console.error(`[browser error] ${error.message}`);
    });
    page.on("response", (response) => {
        if (!response.ok()) {
            console.error(
                `[browser response] ${response.status()} ${response.url()}`
            );
        }
    });
    const testPageUrl = `http://127.0.0.1:${port}/tests/index.html`;

    try {
        const navigationResponse = await page.goto(testPageUrl, { waitUntil: "networkidle" });
        if (!navigationResponse || !navigationResponse.ok()) {
            throw new Error(`Unable to load ${testPageUrl}.`);
        }

        const pollIntervalMilliseconds = 500;
        const maximumAttempts = Math.ceil(30_000 / pollIntervalMilliseconds);
        /** @type {null | unknown} */
        let rawEvaluationResult = null;
        for (let attemptIndex = 0; attemptIndex < maximumAttempts; attemptIndex += 1) {
            rawEvaluationResult = await page.evaluate(
                (resultStorageKey) => {
                    const resultRecord = globalThis[resultStorageKey];
                    if (!resultRecord) {
                        return null;
                    }

                    return JSON.parse(JSON.stringify(resultRecord));
                },
                GLOBAL_RESULT_STORAGE_KEY
            );

            if (rawEvaluationResult !== null) {
                break;
            }

            await page.waitForTimeout(pollIntervalMilliseconds);
        }

        if (rawEvaluationResult === null) {
            throw new Error("Timed out waiting for browser test results.");
        }

        const evaluationSource = /** @type {{ summary?: { passed?: number, failed?: number }, suites?: Array<{ name?: string, tests?: Array<{ name?: string, status?: string, errorMessage?: string }> }> }} */ (
            rawEvaluationResult
        );
        const evaluationResult = {
            summary: {
                passed: Number(evaluationSource.summary?.passed ?? 0),
                failed: Number(evaluationSource.summary?.failed ?? 0)
            },
            suites: Array.isArray(evaluationSource.suites)
                ? evaluationSource.suites.map((suite) => ({
                      name: String(suite?.name ?? ""),
                      tests: Array.isArray(suite?.tests)
                          ? suite.tests.map((test) => ({
                                name: String(test?.name ?? ""),
                                status: test?.status === "failed" ? "failed" : "passed",
                                errorMessage:
                                    typeof test?.errorMessage === "string"
                                        ? test.errorMessage
                                        : undefined
                            }))
                          : []
                  }))
                : []
        };

        const failedTestSummaries = [];
        for (const suiteResult of evaluationResult.suites) {
            for (const testResult of suiteResult.tests) {
                if (testResult.status === "failed") {
                    const failureLabel = `${suiteResult.name} › ${testResult.name}`;
                    if (testResult.errorMessage) {
                        failedTestSummaries.push(
                            `${failureLabel} — ${testResult.errorMessage}`
                        );
                    } else {
                        failedTestSummaries.push(failureLabel);
                    }
                }
            }
        }

        if (evaluationResult.summary.failed > 0 || failedTestSummaries.length > 0) {
            const failureSummary = failedTestSummaries.join("\n- ") || "(no details provided)";
            throw new Error(
                `Browser tests failed. Passed: ${evaluationResult.summary.passed} • Failed: ${evaluationResult.summary.failed}\nFailed tests:\n- ${failureSummary}`
            );
        }

        console.info(
            `Passed: ${evaluationResult.summary.passed} • Failed: ${evaluationResult.summary.failed}`
        );
    } finally {
        await browser.close();
        await stopStaticServer(server);
    }
}

await runBrowserTestSuite();
