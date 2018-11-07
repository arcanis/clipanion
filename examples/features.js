import { concierge } from '../sources/core';

concierge.command(`hello`)
    .describe(`say hello`)

    .detail(`
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed egestas augue est, ut pulvinar lectus ultrices et. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae.

        Aliquam odio risus, auctor et diam vel, aliquet tempor est. Fusce eu lacus eget tellus tincidunt porta a eu nibh. Vivamus dictum ex sapien, non tempor urna dictum et. Curabitur facilisis orci sodales velit volutpat, eu varius quam feugiat. In eu sapien magna. Sed dignissim semper ex, vitae accumsan ex bibendum ac.
    `)

    .example(`Simply say hello`, `
        $> berry hello
    `)

    .action(() => {
        console.log(`hello`);
    });

concierge
    .runExit(process.argv0, process.argv.slice(2));
