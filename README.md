# Badger Spill API

This repository contains code for the API server that handles spill submissions. It is deployed using containers and Docker Compose.

## Prerequisites

The Badger Spill API requires these environment variables to be set before running the program:

```
RECAPTCHA_SECRET_KEY # Recaptcha secret key obtaineed from Google
EMAIL_USERNAME # email that you want to log into
EMAIL_PASSWORD # password for the email
SMTP_HOST # Domain of the smtp server you want to log into
SMTP_PORT # Port to log into smtp with
PORT # The port to run the http server at
```

You can set these environment variables permanently using a bashrc file (typically located at ~./.bashrc).

```bash
# At bottom of ~/.bashrc 
export RECAPTCHA_SECRET_KEY=123456789
export EMAIL_USERNAME="example@cooldomain.com"
export EMAIL_PASSWORD="myemailpassword"
export SMTP_HOST="smtp.mydomain.com"
export SMTP_PORT=465
export PORT=8080
```

You should use a reverse proxy to secure this server with HTTPS. By default, this server only uses HTTP. [Caddy](https://caddyserver.com) is wicked easy to set up and is recommended for securing the server with HTTPS. A Recaptcha v2 Checkbox key can be obtained from Google. You will need to find an email provider that allows username/password access to SMTP or maintain your own email server.

You will neeed to install Docker and Docker Compose (which is typically bundled with Docker) to use this program.

## Installing

After completing the prerequisites, installation is simple. All you have to do is clone the repository, open a firewall port, and build the container!

```bash
git clone https://github.com/Badger-Spill/badger-spill-api
sudo ufw allow 443 # Allow HTTPS connections through firewall
sudo docker build . -t badger-spill-api
```


## Using

The Badger Spill API uses Docker Compose to containerize and daemonize itself. This makes deployments incredibly simple and reproducible. By default, the Badger Spill API server will auto-restart in the event of a crash. This can be changed in ```docker-compose.yml``` if desired.

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

### Email
The trickiest part of getting this API server to run is finding an email provider. Surprisingly, maintaining our own email server was the easiest and cheapest solution for this. We use [docker-mailserver](https://github.com/docker-mailserver/docker-mailserver) to do this. Similar to deploying this API, you only need to clone the repository and execute a few commands to install this software. You will need to configure some DNS records (through your domain provider) and change some config variables, but other than that, the setup is pretty minimal. You will also need to whitelist your new email from landing in a spam inbox on your receiving email (since self-hosted email often ends up in spam inboxes). 

## License

This program is free software licensed under the GNU AGPL v3.