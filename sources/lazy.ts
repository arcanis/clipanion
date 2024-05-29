function findIndexOrLength<T>(array: Array<T>, predicate: (value: T) => boolean) {
  const index = array.findIndex(predicate);
  return index !== -1 ? index : array.length;
}

export type LazyFactory<TContext, TRet> = (
  segment: string,
  ctx: TContext | undefined,
) => Promise<{
  context: TContext | null;
  node: TRet | null;
} | null>;

export async function lazyFactory<TContext, TRet>(args: Array<string>, factory: LazyFactory<TContext, TRet>) {
  const production: Array<TRet> = [];
  const firstOptionIndex = findIndexOrLength(args, arg => arg[0] === `-`);

  function loadBranch(argIndex: number, context?: TContext) {
    if (argIndex >= firstOptionIndex) {
      return Promise.all([loadBranchImpl(argIndex, context), loadBranchImpl(argIndex + 1, context)]);
    } else {
      return loadBranchImpl(argIndex, context);
    }
  }

  async function loadBranchImpl(argIndex: number, context?: TContext) {
    if (argIndex >= args.length)
      return;

    const res = await factory(args[argIndex], context);

    if (res === null)
      return;

    if (res.node !== null)
      production.push(res.node);

    if (res.context !== null) {
      await loadBranch(argIndex + 1, res.context);
    }
  }

  await loadBranch(0);

  return production.flat();
}

export type LazyTree<T> = {
  [key: string]: {
    value?: T;
    children?: LazyTree<T>;
  };
};

export async function lazyTree<T, TMap>(args: Array<string>, tree: LazyTree<T>, map: (val: T) => Promise<Array<TMap>>): Promise<Array<TMap>> {
  return lazyFactory(args, async (segment, ctx: LazyTree<T> = tree) => {
    if (!Object.prototype.hasOwnProperty.call(ctx, segment))
      return null;

    const node = ctx[segment];

    return {
      context: node.children ?? null,
      node: node.value != null ? await map(node.value) : null,
    };
  });
}
