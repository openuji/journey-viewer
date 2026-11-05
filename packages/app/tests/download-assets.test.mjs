import assert from "node:assert/strict";
import test from "node:test";
import { unzipSync, strFromU8 } from "fflate";
import { assetDownloadName, createAssetArchive } from "@/download-assets";

const signal = () => new AbortController().signal;
const input = {
  text: '{\n  "@id": "urn:test", "extension": {"uninterpreted": true}\n}\n',
  screenshots: {},
  touchpoints: {},
};
const unpack = async (blob) => {
  assert.equal(blob.type, "application/zip");
  return unzipSync(new Uint8Array(await blob.arrayBuffer()));
};

test("the archive preserves original text and settings, rewrites paths and fetches each shared image once", async (t) => {
  const urls = [
    "https://a.example/images/screen.png",
    "https://b.example/screen.png",
  ];
  const bytes = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])];
  const requests = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    requests.push(url);
    return new Response(bytes[urls.indexOf(url)], {
      headers: { "content-type": "image/png" },
    });
  });
  const touchpoints = {
    "urn:touchpoint": { shortLabel: "Web", color: "#336699" },
  };
  const files = await unpack(
    await createAssetArchive(
      {
        ...input,
        screenshots: {
          "urn:first": urls[0],
          "urn:second": urls[1],
          "urn:shared": urls[0],
        },
        touchpoints,
      },
      signal(),
    ),
  );
  assert.equal(strFromU8(files["document.jsonld"]), input.text);
  assert.deepEqual(
    JSON.parse(strFromU8(files["touchpoints.json"])),
    touchpoints,
  );
  const map = JSON.parse(strFromU8(files["screenshots.json"]));
  assert.equal(map["urn:shared"], map["urn:first"]);
  assert.notEqual(map["urn:first"], map["urn:second"]);
  for (const [index, ref] of ["urn:first", "urn:second"].entries()) {
    assert.match(map[ref], /^screens\/[^/]+\.png$/);
    assert.deepEqual(files[map[ref]], bytes[index]);
  }
  assert.deepEqual(requests, urls);
  assert.equal(Object.keys(files).length, 5);
});

test("a document without presentation assets exports empty maps without fetching", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () =>
    assert.fail("unexpected fetch"),
  );
  const files = await unpack(await createAssetArchive(input, signal()));
  assert.deepEqual(Object.keys(files).sort(), [
    "document.jsonld",
    "screenshots.json",
    "touchpoints.json",
  ]);
  assert.equal(strFromU8(files["document.jsonld"]), input.text);
  assert.deepEqual(JSON.parse(strFromU8(files["screenshots.json"])), {});
  assert.deepEqual(JSON.parse(strFromU8(files["touchpoints.json"])), {});
  assert.equal(fetch.mock.callCount(), 0);
});

test("missing images, blocked remote requests and HTML fallback responses name the failed asset", async (t) => {
  const url = "https://images.example/missing.png";
  const source = { ...input, screenshots: { "urn:surface": url } };
  for (const [respond, reason] of [
    [() => new Response("missing", { status: 404 }), /status 404/],
    [
      () => {
        throw new TypeError("Failed to fetch");
      },
      /Failed to fetch/,
    ],
    [
      () =>
        new Response("<!doctype html>", {
          headers: { "content-type": "text/html" },
        }),
      /HTML instead of an image/,
    ],
  ]) {
    const fetch = t.mock.method(globalThis, "fetch", respond);
    await assert.rejects(createAssetArchive(source, signal()), (error) => {
      assert.ok(error.message.includes(url));
      assert.match(error.message, reason);
      return true;
    });
    fetch.mock.restore();
  }
});

test("cancellation before a read or during an image fetch never returns an archive", async (t) => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(createAssetArchive(input, controller.signal), {
    name: "AbortError",
  });
  const pending = new AbortController();
  t.mock.method(
    globalThis,
    "fetch",
    (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      }),
  );
  const archive = createAssetArchive(
    {
      ...input,
      screenshots: { "urn:surface": "https://images.example/screen.png" },
    },
    pending.signal,
  );
  pending.abort();
  await assert.rejects(archive, { name: "AbortError" });
});

test("a large archive can be cancelled during compression", async () => {
  const controller = new AbortController();
  const archive = createAssetArchive(
    { ...input, text: "uninterpreted content ".repeat(50_000) },
    controller.signal,
  );
  await Promise.resolve();
  controller.abort();
  await assert.rejects(archive, { name: "AbortError" });
});

test("download names remove document extensions and unsafe filename characters", () => {
  assert.equal(
    assetDownloadName("user-journeys.ujg.jsonld"),
    "user-journeys-ujg-assets.zip",
  );
  assert.equal(assetDownloadName("Checkout.json"), "Checkout-ujg-assets.zip");
  assert.equal(
    assetDownloadName("Solid-OIDC example"),
    "Solid-OIDC-example-ujg-assets.zip",
  );
  assert.equal(
    assetDownloadName("../a\\b:<test>?*.jsonld"),
    "a-b-test-ujg-assets.zip",
  );
  assert.equal(assetDownloadName("💾.jsonld"), "journey-ujg-assets.zip");
});
