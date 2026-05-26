import { expect } from "chai";

import { hashFile } from "./hash.ts";

describe("hashFile", () => {
  it("hashes file contents locally and reports progress", async () => {
    const file = new File([new TextEncoder().encode("zknotary-phase-2")], "proof.txt", {
      type: "text/plain"
    });
    const progressUpdates: number[] = [];

    const hash = await hashFile(file, (progress: number) => {
      progressUpdates.push(progress);
    });

    expect(hash).to.equal(
      "0xb7bde3a1cc4b825984e69218cca147967cb2757ea463aec9e3d42730f03be578"
    );
    expect(progressUpdates.length).to.be.greaterThan(0);
    expect(progressUpdates.at(-1)).to.equal(100);
  });
});
