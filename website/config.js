// @ts-check

module.exports = {
  name: `Clipanion`,
  repository: `clipanion`,
  description: `Type-safe CLI library with no runtime dependencies`,
  algolia: `d4d96f8710b3d92b82fe3e01cb108e0c`,

  icon: {
    letter: `C`,
  },

  colors: {
    primary: `#7a75ad`,
  },

  sidebar: {
    General: [`overview`, `getting-started`, `paths`, `options`, `contexts`, `validation`, `help`, `tips`, `completion`],
    API: [`api/cli`, `api/builtins`, `api/option`],
  },

  index: {
    getStarted: `/docs`,
    features: [{
      title: `Type Safe`,
      description: `Clipanion provides type inference for the options you declare: no duplicated types to write and keep in sync.`,
    }, {
      title: `Tooling Integration`,
      description: `Because it uses standard ES6 classes, tools like ESLint can easily lint your options to detect the unused ones.`,
    }, {
      title: `Feature Complete`,
      description: `Clipanion supports subcommands, arrays, counters, execution contexts, error handling, option proxying, and much more.`,
    }, {
      title: `Soundness`,
      description: `Clipanion unifies your commands into a proper state machine. It gives little room for bugs, and unlocks command overloads.`,
    }, {
      title: `Tree Shaking`,
      description: `The core is implemented using a functional approach, letting most bundlers only keep what you actually use.`,
    }, {
      title: `Battle Tested`,
      description: `Clipanion is used to power Yarn - likely one of the most complex CLI used everyday by the JavaScript community.`,
    }],
  },
};
