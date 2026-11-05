import assert from "node:assert/strict";
import test from "node:test";

/** Exercise the real JourneyLightbox through the compiled consumer, not a mocked modal. */
export async function checkLightbox({ page, url, evidence }) {
  const dialog = () =>
    page.getByRole("dialog", { name: "Screenshot viewer", exact: true });
  const button = (name) => dialog().getByRole("button", { name, exact: true });
  const frame = () => dialog().locator("[data-image-status]");
  const details = () =>
    dialog().getByRole("region", { name: "Screenshot details", exact: true });
  const ready = () => dialog().locator('[data-image-status="ready"]').waitFor();
  const open = async () => {
    await page.goto(`${url}/viewer-consumer/`);
    await page
      .getByTestId("lightbox-shapes")
      .getByRole("button", { name: "Expand all", exact: true })
      .click();
    await page
      .getByTestId("lightbox-shapes")
      .locator('[data-state-ref="urn:lightbox:landscape"]')
      .getByRole("button", { name: /^Screen mockup:/ })
      .first()
      .click();
    await ready();
  };
  const geometry = () =>
    dialog().evaluate((element) => {
      const rect = (node) => {
        const { x, y, width, height } = node.getBoundingClientRect();
        return { x, y, width, height };
      };
      return {
        stage: rect(element.querySelector("figure > div")),
        caption: rect(element.querySelector("figcaption")),
        controls: [...element.querySelectorAll("button")].map(rect),
      };
    });
  const sampleFrames = (count = 12) =>
    dialog().evaluate(
      (element, count) =>
        new Promise((resolve) => {
          const frames = [];
          const rect = (node) => {
            const { x, y, width, height } = node.getBoundingClientRect();
            return { x, y, width, height };
          };
          const sample = () => {
            const frame = element.querySelector("[data-image-status]");
            const image = frame.querySelector("img");
            frames.push({
              stage: rect(element.querySelector("figure > div")),
              frame: rect(frame),
              caption: rect(element.querySelector("figcaption")),
              status: frame.dataset.imageStatus,
              source: image?.getAttribute("src"),
              visible: image ? getComputedStyle(image).opacity !== "0" : false,
            });
            if (frames.length === count) resolve(frames);
            else requestAnimationFrame(sample);
          };
          requestAnimationFrame(sample);
        }),
      count,
    );
  const insideViewport = async () => {
    const result = await dialog().evaluate((element) => {
      const nodes = [
        element,
        element.querySelector("figure > div"),
        element.querySelector("figcaption"),
        element.querySelector('[aria-label="Screenshot details"]'),
        ...element.querySelectorAll("button"),
      ];
      return nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return {
          name: node.getAttribute("aria-label") ?? node.tagName,
          inside:
            rect.left >= 0 &&
            rect.top >= 0 &&
            rect.right <= innerWidth + 1 &&
            rect.bottom <= innerHeight + 1 &&
            rect.width > 0 &&
            rect.height > 0,
        };
      });
    });
    for (const { name, inside } of result)
      assert.equal(inside, true, `${name} stays in the viewport`);
  };
  const fittedImage = async () => {
    const image = await dialog()
      .locator("img")
      .evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const stage = element.parentElement.getBoundingClientRect();
        return {
          width: bounds.width,
          height: bounds.height,
          naturalWidth: element.naturalWidth,
          naturalHeight: element.naturalHeight,
          inside:
            bounds.left >= stage.left - 1 &&
            bounds.top >= stage.top - 1 &&
            bounds.right <= stage.right + 1 &&
            bounds.bottom <= stage.bottom + 1,
        };
      });
    assert.ok(image.inside);
    assert.ok(
      Math.abs(
        image.width / image.height - image.naturalWidth / image.naturalHeight,
      ) < 0.01,
    );
    assert.ok(
      image.width <= image.naturalWidth + 1 &&
        image.height <= Math.min(image.naturalHeight, 760) + 1,
    );
  };

  await test("mixed screenshot shapes and long captions keep the stage, toolbar and all controls inside the viewport", async () => {
    for (const [width, height, scale] of [
      [1280, 900, 1],
      [320, 568, 1],
      [800, 360, 1],
      [640, 450, 2],
    ]) {
      await page.setViewportSize({ width, height });
      await open();
      if (scale === 2)
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "200%";
        });
      const baseline = await geometry();
      for (let index = 0; index < 13; index++) {
        await ready();
        await insideViewport();
        await fittedImage();
        assert.deepEqual(
          await geometry(),
          baseline,
          "image shape does not move the footer or stage",
        );
        assert.equal(
          await details().evaluate(
            (element) => element.scrollHeight > element.clientHeight,
          ),
          true,
        );
        if (index === 0)
          await page.screenshot({
            path: `${evidence}/lightbox-stable-${width}-${height}-${scale}.png`,
          });
        await button("Next screen").click();
      }
      await details().focus();
      await details().press("End");
      await page.waitForFunction(
        () =>
          document.querySelector('[aria-label="Screenshot details"]')
            .scrollTop > 0,
      );
      await insideViewport();
      await dialog().press("Escape");
    }
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "";
    });
  });

  await test("original size scrolls at natural dimensions, preserves control focus, and resets for another view or URL", async () => {
    await page.setViewportSize({ width: 1000, height: 650 });
    await open();
    assert.equal(
      await button("Close screenshot").evaluate(
        (element) => element === document.activeElement,
      ),
      true,
    );
    const baseline = await geometry();
    await button("Original size").click();
    const image = await dialog()
      .locator("img")
      .evaluate((element) => ({
        width: element.width,
        height: element.height,
        naturalWidth: element.naturalWidth,
        naturalHeight: element.naturalHeight,
      }));
    assert.equal(image.width, image.naturalWidth);
    assert.equal(image.height, image.naturalHeight);
    assert.deepEqual(await geometry(), baseline);
    const viewport = dialog().getByRole("region", {
      name: "Screenshot image",
      exact: true,
    });
    assert.deepEqual(
      await viewport.evaluate((element) => [
        element.scrollLeft,
        element.scrollTop,
      ]),
      [0, 0],
    );
    await viewport.focus();
    await viewport.press("ArrowRight");
    await page.waitForFunction(
      () =>
        document.querySelector('[aria-label="Screenshot image"]').scrollLeft >
        0,
    );
    await viewport.press("ArrowDown");
    await page.waitForFunction(
      () =>
        document.querySelector('[aria-label="Screenshot image"]').scrollTop > 0,
    );
    assert.match(
      await dialog().getByRole("heading").textContent(),
      /^landscape/,
    );
    await page.setViewportSize({ width: 800, height: 500 });
    assert.equal(await frame().getAttribute("data-fit"), "original");
    await button("Fit to window").click();
    await fittedImage();
    assert.equal(
      await button("Original size").evaluate(
        (element) => element === document.activeElement,
      ),
      true,
    );
    await button("Original size").click();
    await button("Next screen").click();
    await ready();
    assert.equal(await frame().getAttribute("data-fit"), "contain");
    assert.equal(
      await button("Next screen").evaluate(
        (element) => element === document.activeElement,
      ),
      true,
    );
    await button("Previous screen").click();
    await ready();
    await button("Original size").click();
    await page
      .getByRole("button", {
        name: "Replace landscape URL",
        exact: true,
        includeHidden: true,
      })
      .evaluate((element) =>
        element.dispatchEvent(new MouseEvent("click", { bubbles: true })),
      );
    await ready();
    assert.equal(await frame().getAttribute("data-fit"), "contain");
    assert.match(
      await dialog().locator("img").getAttribute("src"),
      /revision=2$/,
    );
    await button("Original size").click();
    await button("Close screenshot").focus();
    await page.keyboard.press("Tab");
    assert.equal(
      await viewport.evaluate((element) => element === document.activeElement),
      true,
    );
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await button("Close screenshot").evaluate(
        (element) => element === document.activeElement,
      ),
      true,
    );
    await page.keyboard.press("Escape");
    await page
      .getByTestId("lightbox-shapes")
      .locator('[data-state-ref="urn:lightbox:landscape"]')
      .getByRole("button", { name: /^Screen mockup:/ })
      .first()
      .click();
    assert.equal(await frame().getAttribute("data-fit"), "contain");
    await dialog().press("Escape");
  });

  await test("delayed loads and cached navigation never paint a portrait placeholder or stale screenshot", async () => {
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    const pattern = "**/lightbox-fixtures/portrait.svg";
    await page.route(pattern, async (route) => {
      await gate;
      await route.continue();
    });
    try {
      await page.setViewportSize({ width: 1280, height: 900 });
      await open();
      const baseline = await geometry();
      await button("Next screen").click();
      const loadingFrames = await sampleFrames();
      await insideViewport();
      for (const sample of loadingFrames) {
        assert.equal(sample.status, "loading");
        assert.equal(sample.visible, false);
        assert.deepEqual(sample.stage, baseline.stage);
        assert.deepEqual(sample.frame, baseline.stage);
        assert.deepEqual(sample.caption, baseline.caption);
      }
      // A late load for a skipped image must not replace the latest selection.
      await button("Next screen").click();
      await ready();
      release();
      await page.waitForFunction(() =>
        [...document.images].some(
          (image) =>
            image.src.endsWith("portrait.svg") &&
            image.complete &&
            image.naturalWidth > 0,
        ),
      );
      assert.match(
        await dialog().locator("img").getAttribute("src"),
        /square.svg$/,
      );
      await dialog().press("Escape");
    } finally {
      release();
      await page.unrouteAll({ behavior: "wait" });
    }
    // Routing disables the HTTP cache. Warm and inspect the cache with interception removed.
    await open();
    await button("Next screen").click();
    await ready();
    await button("Next screen").click();
    await ready();
    const baseline = await geometry();
    const samples = sampleFrames();
    await button("Previous screen").click();
    for (const sample of await samples) {
      assert.deepEqual(sample.stage, baseline.stage);
      assert.deepEqual(sample.frame, baseline.stage);
      assert.deepEqual(sample.caption, baseline.caption);
      if (sample.source?.endsWith("portrait.svg"))
        assert.equal(
          sample.status,
          "ready",
          "cached image is ready before a paint",
        );
    }
    await ready();
    await dialog().press("Escape");
  });

  await test("late decode completions cannot settle a newer image or reopen a closed lightbox", async () => {
    let releaseRequest;
    const gate = new Promise((resolve) => {
      releaseRequest = resolve;
    });
    const pattern = "**/lightbox-fixtures/portrait.svg";
    await page.route(pattern, async (route) => {
      await gate;
      await route.continue();
    });
    const errors = [];
    const onError = (error) => errors.push(error.message);
    page.on("pageerror", onError);
    try {
      await open();
      await page.evaluate(() => {
        const decode = HTMLImageElement.prototype.decode;
        window.lightboxDecodeCount = 0;
        HTMLImageElement.prototype.decode = function () {
          if (
            this.closest("dialog") &&
            this.getAttribute("src").endsWith("portrait.svg")
          ) {
            window.lightboxDecodeCount++;
            return new Promise((resolve) => {
              window.finishLightboxDecode = resolve;
            });
          }
          return decode.call(this);
        };
      });
      await button("Next screen").click();
      await page.waitForFunction(() => window.lightboxDecodeCount === 1);
      await button("Next screen").click();
      await ready();
      await page.evaluate(() => window.finishLightboxDecode());
      await sampleFrames(2);
      assert.match(
        await dialog().locator("img").getAttribute("src"),
        /square.svg$/,
      );
      assert.equal(await frame().getAttribute("data-image-status"), "ready");
      await button("Previous screen").click();
      await page.waitForFunction(() => window.lightboxDecodeCount === 2);
      await button("Close screenshot").click();
      await page.evaluate(() => window.finishLightboxDecode());
      assert.equal(await dialog().count(), 0);
      assert.deepEqual(errors, []);
    } finally {
      releaseRequest();
      await page.unrouteAll({ behavior: "wait" });
      page.off("pageerror", onError);
    }
  });
}
