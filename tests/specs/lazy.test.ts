import {lazyTree} from "../../sources/lazy";

describe(`Lazy commands`, () => {
  it(`should lazy-load commands based on the arguments`, async () => {
    const commands = await lazyTree([`foo`], {
      foo: {value: 1},
    }, async val => [
      val,
    ]);

    expect(commands).toEqual([
      1,
    ]);
  });

  it(`should keep looking for sub-command even after matching a first command`, async () => {
    const commands = await lazyTree([`foo`, `bar`], {
      foo: {
        value: 1,
        children: {
          bar: {value: 2},
        },
      },
    }, async val => [
      val,
    ]);

    expect(commands).toEqual([
      1,
      2,
    ]);
  });

  it(`shouldn't look for sibling commands that can't match the provided arguments`, async () => {
    const commands = await lazyTree([`foo`], {
      foo: {value: 1},
      bar: {value: 2},
    }, async val => [
      val,
    ]);

    expect(commands).toEqual([
      1,
    ]);
  });

  it(`shouldn't look for nested commands that can't match the provided arguments`, async () => {
    const commands = await lazyTree([`foo`], {
      foo: {
        value: 1,
        children: {
          bar: {value: 2},
        },
      },
    }, async val => [
      val,
    ]);

    expect(commands).toEqual([
      1,
    ]);
  });

  it(`should consider that options may be part of the path`, async () => {
    const commands = await lazyTree([`--hello`], {
      [`--hello`]: {value: 1},
    }, async val => [
      val,
    ]);

    expect(commands).toEqual([
      1,
    ]);
  });

  it(`should consider that options may have an arbitrary arity`, async () => {
    const commands = await lazyTree([`--foo`, `hello`], {
      [`--foo`]: {value: 1},
      [`hello`]: {value: 2},
      [`world`]: {value: 3},
    }, async val => [
      val,
    ]);

    expect(commands).toEqual([
      1,
      2,
    ]);
  });
});
