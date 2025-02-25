# Badger Spill API

This repository contains code for the API server that handles spill submissions. This API was built using [Hono](https://hono.dev). It is designed to be deployed on Cloudflare Workers, but it could easily be adapted for deployment on any platform that Hono supports. Cloudflare's free tier for Workers is MORE than enough to support Badger Spill's needs, which is why we chose it.

## Prerequisites

1. A Google reCaptcha key (free)
2. A Slack webhook URL (also free)

## Configuration

The Badger Spill API requires these environment variables to be set before running the program:

```
RECAPTCHA_SECRET_KEY # The secret key given to you by Google's reCaptcha service
WEBHOOK_URL # The Slack webhook URL used to deliver spill notifications
```

For local development, you can set these variables using a ``.dev.vars`` file. See ``.dev.vars.example`` for an example.

There are also various constants "baked-in" to the source code at the top of the ``src/index.ts`` file. These constants are specific to Badger Spill, and you will need to change them if you fork the code for another organization.

Badger Spill uses a custom URL for its worker. This is configured in wrangler.jsonc and your Cloudflare Dashboard.

## Local Development

To set up a local development environment, you will need ``pnpm`` installed.

To get started, run ``pnpm install``. Then, when you're ready to spin up a development server, run ``pnpm run dev``. This will allow you to test changes locally. The Badger Spill website will automatically query this development instance when it is also being run in a local development server.

Remember to change your .dev.vars file before testing. **NEVER** commit your environment variables or secrets (which includes your .dev.vars file) to a source code repository.

## Deploying to Cloudflare Workers

Firstly, you will need to add secrets (your WEBHOOK_URL and RECAPTCHA_SECRET_KEY variables) to your Cloudflare Worker. To do this, run:

```bash
npx wrangler secret put WEBHOOK_URL

# enter your webhook URL when prompted

npx wrangler secret put RECAPTCHA_SECRET_KEY

# enter your reCaptcha secret key when prompted
```

Once you add the secrets to your Cloudflare Worker, they will only be accessible from your worker code. They will not be visible from the ``wrangler`` tool or the Cloudflare Dashboard.

As a reminder, you should **NEVER** commit your environment variables or secrets to a source code repository.

To deploy your code, run ``pnpm run deploy``. This will build and deploy your code to a Cloudflare Worker. You can also enable automatic deployment via Git push by linking your repository in the Cloudflare dashboard.

## License

This program is free software licensed under the GNU AGPL v3.

The full terms of the license are available in the ``LICENSE`` file. The key takeaway is that if you host this software over the web, you will be required to open source your code to users. At Badger Spill, we felt that this was the best decision for three reasons:

1. Open source means that anyone can get involved

Open source lowers the barrier to entry for contributing. This allows community members to propose changes and fix bugs. It also means that people get credited publicly for their work. This is great for a resume or portfolio, and it gives other people motivation to contribute. Open sourcing our code also ensures there is a record of the source code even if a primary contributor leaves. This extends the lifetime of the software.

2. Open source via GitHub makes version control a breeze

Prior to open source, Badger Spill was sharing .zip files between contributors. This is a very messy way of sharing code, and it meant that changes were hard to track and reconcile. Using GitHub makes our developer workflow cleaner and allows future maintainers to see the history of the project's files.

3. This isn't a commercial product--it's a community good

Lastly, and most significantly, this isn't a piece of software that will ever be sold. It's a passion project by the student community and for the student community. There's no reason that we need to keep this code private. We stand only to gain by making our work public. We also felt that improvements made to this project should be shared back with the community to ensure that everyone benefits. Open source and AGPL3 align with these values.
