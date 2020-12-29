module.exports = {
  title: `Clipanion`,
  tagline: `Type-safe CLI library with no runtime dependencies`,
  url: `https://mael.dev/clipanion/`,
  baseUrl: process.env.CONTEXT === `production` ? `/clipanion/` : `/`,
  onBrokenLinks: `throw`,
  onBrokenMarkdownLinks: `warn`,
  favicon: `logo.svg`,
  organizationName: `arcanis`,
  projectName: `clipanion`,
  themeConfig: {
    navbar: {
      title: `Clipanion`,
      logo: {
        alt: `Clipanion Logo`,
        src: `logo.svg`,
      },
      items: [
        {
          to: `docs/`,
          activeBasePath: `docs`,
          label: `Docs`,
          position: `left`,
        },
        {
          href: `https://github.com/arcanis/clipanion`,
          label: `GitHub`,
          position: `right`,
        },
      ],
    },
    footer: {
      style: `dark`,
      links: [
        {
          title: `Community`,
          items: [
            {
              label: `Discord`,
              href: `https://discordapp.com/invite/yarnpkg`,
            },
          ],
        },
        {
          title: `More`,
          items: [
            {
              label: `GitHub`,
              href: `https://github.com/arcanis/clipanion`,
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Clipanion, Inc. Built with Docusaurus.`,
    },
    prism: {
      theme: require(`prism-react-renderer/themes/vsDark`),
    },
  },
  presets: [
    [
      `@docusaurus/preset-classic`,
      {
        docs: {
          sidebarPath: require.resolve(`./sidebars.js`),
          editUrl: `https://github.com/arcanis/clipanion/edit/master/website/`,
        },
        blog: {
          showReadingTime: true,
          editUrl: `https://github.com/arcanis/clipanion/edit/master/website/blog/`,
        },
        theme: {
          customCss: require.resolve(`./src/css/custom.css`),
        },
      },
    ],
  ],
};
