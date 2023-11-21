import {lazyTree} from "../../sources/lazy";

describe(`Lazy commands`, () => {
  it(`should lazy-load commands based on the arguments`, async () => {
    const commands = await lazyTree([`foo`], {
      foo: async () => 1,
    });

    expect(commands).toEqual([
      1,
    ]);
  });

  it(`should keep looking for sub-command even after matching a first command`, async () => {
    const commands = await lazyTree([`foo`, `bar`], {
      foo: {
        default: async () => 1,
        bar: async () => 2,
      },
    });

    expect(commands).toEqual([
      1,
      2,
    ]);
  });

  it(`shouldn't look for sibling commands that can't match the provided arguments`, async () => {
    const commands = await lazyTree([`foo`], {
      foo: async () => 1,
      bar: async () => 2,
    });

    expect(commands).toEqual([
      1,
    ]);
  });

  it(`shouldn't look for nested commands that can't match the provided arguments`, async () => {
    const commands = await lazyTree([`foo`], {
      foo: {
        default: async () => 1,
        bar: async () => 2,
      },
    });

    expect(commands).toEqual([
      1,
    ]);
  });

  it(`should consider that options may be part of the path`, async () => {
    const commands = await lazyTree([`--hello`], {
      [`--hello`]: async () => 1,
    });

    expect(commands).toEqual([
      1,
    ]);
  });

  it(`should consider that options may have an arbitrary arity`, async () => {
    const commands = await lazyTree([`--foo`, `hello`], {
      [`--foo`]: async () => 1,
      [`hello`] : async () => 2,
      [`world`] : async () => 3,
    });

    expect(commands).toEqual([
      1,
      2,
    ]);
  });
});
