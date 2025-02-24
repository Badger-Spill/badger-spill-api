# Badger Spill API

This repository contains code for the API server that handles spill submissions. It is deployed using containers and Docker Compose.

## Prerequisites

1. A server with Docker installed
2. A Google reCaptcha key (free)
3. A Slack webhook URL (also free)

## Configuration

The Badger Spill API requires these environment variables to be set before running the program:

```
RECAPTCHA_SECRET_KEY # The secret key given to you by Google's reCaptcha service
WEBHOOK_URL # The Slack webhook URL used to deliver spill notifications
PORT # The port that the server listens on
BEHIND_REVERSE_PROXY # whether or not the server is behind a reverse proxy (acceptable values: false, true)
```

You can set these environment variables permanently using a bashrc file (typically located at ~./.bashrc).

```bash
# At bottom of ~/.bashrc 
export RECAPTCHA_SECRET_KEY=123456789
export WEBHOOK_URL="https://hooks.slack.com/services/replace-with-your-webhook-url"
export PORT=8080
export BEHIND_REVERSE_PROXY=true # set true if using reverse proxy, allows ip forwarding from proxy
```

There are also various constants "baked-in" to the source code at the top of the ``server.js`` file.

## Installing

After completing the prerequisites and configuring environment variables, installation is simple. All you have to do is clone the repository, open a firewall port, and build the container!

```bash
git clone https://github.com/Badger-Spill/badger-spill-api
sudo ufw allow 443 # Allow HTTPS connections through firewall
sudo docker build . -t badger-spill-api
```

## Securing with HTTPS

By default, this code only provides an HTTP server. This is acceptable for local development. For a production deployment, though, it is imperative to use HTTPS. The easiest way to do this is with a reverse proxy. We use [Caddy](https://caddyserver.com) at Badger Spill. It is extremely easy to set up, and it manages certificate provisioning/renewal for you. If you use a reverse proxy to secure your app, make sure to set the ``BEHIND_REVERSE_PROXY`` header to ``true``.

## Using

The Badger Spill API uses Docker Compose as a daemon. This makes deployments simple and reproducible. By default, the Badger Spill API server will auto-restart in the event of a crash. This can be changed in ```docker-compose.yml``` if desired.

Starting API server:
```bash
cd /path/to/cloned/repository
sudo -E docker compose up -d # Must use sudo -E to pass environment variables
```

Stopping the API server:
```bash
cd /path/to/cloned/repository
sudo -E docker compose down
```

## Updating

Updating is also very simple! Push your changes to this repository, pull them in via git on the server, and rebuild the container!

```bash
cd /path/to/cloned/repository
sudo -E docker compose down
git pull
sudo docker build . -t badger-spill-api
sudo -E docker compose up -d
```

## Note to future mantainers

### A word on security
It is recommended you take some precautions to prevent unauthorized access to the API server. Firstly, you should install and configure fail2ban to prevent brute-force attacks on ssh. Secondly, you should configure SSH to use ssh keys instead of passswords (and disable password login once you have done so). Lastly, you should disable root login via ssh.

### Keeping the system up-to-date
In addition to these basic security measures, it is highly recommended that you regularly update the system.

## License

This program is free software licensed under the GNU AGPL v3.

The full terms of the license are available in the ``LICENSE`` file. The key takeaway is that if you host this software over the web, you will be required to open source your code to users. At Badger Spill, we felt that this was the best decision for three reasons:

1. Open source means that anyone can get involved

Open source lowers the barrier to entry for contributing. This allows community members to propose changes and fix bugs. It also means that people get credited publicly for their work. This is great for a resume or portfolio, and it gives other people motivation to contribute. Open sourcing our code also ensures there is a record of the source code even if a primary contributor leaves. This extends the lifetime of the software.

2. Open source via GitHub makes version control a breeze

Prior to open source, Badger Spill was sharing .zip files between contributors. This is a very messy way of sharing code, and it meant that changes were hard to track and reconcile. Using GitHub makes our developer workflow cleaner and allows future maintainers to see the history of the project's files.

3. This isn't a commercial product--it's a community good

Lastly, and most significantly, this isn't a piece of software that will ever be sold. It's a passion project by the student community and for the student community. There's no reason that we need to keep this code private. We stand only to gain by making our work public. Open source aligns with these values.
