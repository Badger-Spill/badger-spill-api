/*
  This program is the API server for the Badger Spill website.

  Copyright (C) 2023-2024 James Julich

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU Affero General Public License as published
  by the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU Affero General Public License for more details.

  You should have received a copy of the GNU Affero General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const process = require("process");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
const http = require("http");
const zod = require("zod");

// Read from .env file
require('dotenv').config();

// Config
const TIME_LOCALE = "en-US";
const TIMEZONE = "America/Chicago";
const CORS_WHITELIST = [
  "https://thebadgerspill.com",
  "https://badger-spill.github.io",
  "http://localhost:4321",
]; // This is the list of domains that forms can be submitted from
const EMAIL_ENDING = "wisc.edu";
const MAX_MESSAGE_LENGTH = 10000;

// Environment Variables
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const PORT = process.env.PORT;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

const emailValidator = zod.string().email().endsWith(EMAIL_ENDING).max(50);
const messageValidator = zod.string().max(MAX_MESSAGE_LENGTH);

/**
 * This function contacts Google's servers and verifies the captcha response.
 * @param {*} req the request object
 * @returns true or false depending on captcha validity/presence
 */
async function validateCaptcha(req) {
  if (!req.body["g-recaptcha-response"]) {
    return false;
  }
  const responseKey = req.body["g-recaptcha-response"];

  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${responseKey}`;
  try {
    const googleResponse = await (await fetch(url, { method: "POST" })).json();
    return googleResponse.success == true;
  } catch (error) {
    return false;
  }
}

function getSlackMessageObject(email, ip, message) {
  return {
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*New spill received!*"
        }
      },
      {
        "type": "divider"
      },
      {
        "type": "section",
        "text": {
          "type": "plain_text",
          "text": message,
          "emoji": true
        }
      },
      {
        "type": "divider"
      },
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Sender info, keep confidential!*"
        }
      },
      {
        "type": "section",
        "text": {
          "type": "plain_text",
          "text": `Email: ${email}`,
          "emoji": true
        }
      },
      {
        "type": "section",
        "text": {
          "type": "plain_text",
          "text": `IP Address: ${ip}`,
          "emoji": true
        }
      }
    ]
  }
}

async function sendSlackMessage(messageObj) {
  console.log(JSON.stringify(messageObj))
  await fetch(WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify(messageObj),
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

const app = express();

// Set up CORS headers
const corsOptions = {
  origin: CORS_WHITELIST,
};
app.use(cors(corsOptions));

// Populate body for application/json requests
app.use(express.json());

app.get("/status", async (req, res) => {
  res.status(200).send();
  return;
});

app.post("/spill", async (req, res) => {
  if (!req.body) {
    res.status(400).send("No body attached to request.");
    return;
  }

  // Verify captcha
  if (!(await validateCaptcha(req))) {
    res
      .status(400)
      .send(
        'Please complete the captcha (the "I\'m not a robot" checkbox) and try again.'
      );
    return;
  }

  // Verify email is @wisc.edu
  let email;
  try {
    email = emailValidator.parse(req.body["email"].toLowerCase())
  }
  catch {
    res
      .status(400)
      .send(
        "A wisc.edu email must be specified so that we can respond to your message. Only students with valid wisc.edu email may submit messages."
      );
    return;
  }

  let message;
  try {
    message = messageValidator.parse(req.body["message"])
  }
  catch {
    res
      .status(400)
      .send(
        `A message must be included. Messages cannot be longer than ${MAX_MESSAGE_LENGTH} characters.`
      );
    return;
  }

  // Send spill to Slack
  try {
    await sendSlackMessage(getSlackMessageObject(email, req.ip, message));
    res.status(200).send("Your spill has been sent successfully!");
    return;
  }
  catch {
    res
      .status(500)
      .send(
        "There was an error. Please email dev.badgerspill@gmail.com to let us know something went wrong. We will fix our server issues, and then you can resubmit your message."
      );
    return;
  }
});

const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`Badger Spill API started on port ${PORT}.`);
});
