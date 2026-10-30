import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { readSource } from "@/read-source";

// A host with one site under a sub-path; every request is recorded.
const files = {
  "/maps/a/journey/document.jsonld": '{"@id":"urn:a"}',
  "/maps/a/journey/screens/map.json": JSON.stringify({
    "urn:a:surface": "./images/a.png",
    "urn:a:remote": "https://images.example/b.png",
  }),
  "/maps/a/journey/touchpoints.json": '{"urn:a:tp":{"shortLabel":"A"}}',
  "/maps/a/journey/null.json": "null",
  "/maps/a/journey/text.json": '"screens"',
  "/maps/a/journey/page.json": "<!doctype html><title>Fallback</title>",
  "/maps/a/journey/numbers.json": '{"urn:a:tp":{"color":3}}',
};
const requested = [];
const server = createServer((request, response) => {
  requested.push(request.url);
  const body = files[request.url];
  response.writeHead(body === undefined ? 404 : 200).end(body);
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const page = `http://127.0.0.1:${server.address().port}/maps/a/`;
test.after(() => server.close());

test("relative URLs resolve against the page; screenshot paths against their map", async () => {
  requested.length = 0;
  const input = await readSource(
    {
      name: "a.jsonld",
      document: "journey/document.jsonld",
      screenshots: "journey/screens/map.json",
      touchpoints: "journey/touchpoints.json",
    },
    new AbortController().signal,
    page,
  );
  assert.equal(input.text, '{"@id":"urn:a"}');
  assert.deepEqual(input.screenshots, {
    "urn:a:surface": `${page}journey/screens/images/a.png`,
    "urn:a:remote": "https://images.example/b.png",
  });
  assert.deepEqual(input.touchpoints, { "urn:a:tp": { shortLabel: "A" } });
  assert.deepEqual(requested.sort(), [
    "/maps/a/journey/document.jsonld",
    "/maps/a/journey/screens/map.json",
    "/maps/a/journey/touchpoints.json",
  ]);
});

test("absent presentation inputs are empty and never requested", async () => {
  requested.length = 0;
  const input = await readSource(
    { name: "a.jsonld", document: "journey/document.jsonld" },
    new AbortController().signal,
    page,
  );
  assert.deepEqual(input, {
    text: '{"@id":"urn:a"}',
    screenshots: {},
    touchpoints: {},
  });
  assert.deepEqual(requested, ["/maps/a/journey/document.jsonld"]);
});

test("a missing file fails the read with its URL and status", async () => {
  await assert.rejects(
    readSource(
      {
        name: "a.jsonld",
        document: "journey/document.jsonld",
        touchpoints: "journey/missing.json",
      },
      new AbortController().signal,
      page,
    ),
    { message: `${page}journey/missing.json answered with status 404.` },
  );
});

test("presentation inputs that are not JSON of their shape fail the read instead of reaching the viewer", async () => {
  const read = (input) =>
    readSource(
      { name: "a.jsonld", document: "journey/document.jsonld", ...input },
      new AbortController().signal,
      page,
    );
  for (const [input, message] of [
    [
      { touchpoints: "journey/null.json" },
      /null\.json must map Touchpoint IDs/,
    ],
    [
      { touchpoints: "journey/numbers.json" },
      /numbers\.json must map Touchpoint IDs/,
    ],
    [
      { screenshots: "journey/text.json" },
      /text\.json must map Surface IDs to image paths/,
    ],
    [{ screenshots: "journey/null.json" }, /null\.json must map Surface IDs/],
    [{ touchpoints: "journey/page.json" }, /page\.json is not JSON/],
  ])
    await assert.rejects(read(input), { message }, JSON.stringify(input));
});
