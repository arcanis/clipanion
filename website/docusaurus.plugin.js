module.exports = (context, options) => ({
  name: `custom-plugin`,
  configureWebpack(config) {
    for (const rule of config.module.rules)
      if (rule.test.source.endsWith(`\\.css$`))
        for (const loader of rule.use)
          if (loader.loader.includes(`/postcss-loader/`))
            loader.options.plugins = [require(`tailwindcss`), loader.options.plugins];

    return {};
  }
});
