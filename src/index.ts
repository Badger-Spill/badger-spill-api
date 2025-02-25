/*
  This program is the API server for the Badger Spill website.

  Copyright (C) 2023-2025 James Julich

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

import { Context, Hono } from "hono";
import { getConnInfo } from "hono/cloudflare-workers";
import { cors } from "hono/cors";
import zod from "zod";

// Initialize Hono
const app = new Hono();

// "Baked-in" Configuration Values

// This is the list of domains that forms can be submitted from
const CORS_WHITELIST = [
  "https://thebadgerspill.com",
  "https://badger-spill.github.io",
  "http://localhost:4321",
];
const EMAIL_ENDING = "wisc.edu";
const MAX_MESSAGE_LENGTH = 10000;
const DEV_EMAIL = "dev.badgerspill@gmail.com";

// Validators
const emailValidator = zod.string().email().endsWith(EMAIL_ENDING).max(50);
const messageValidator = zod.string().max(MAX_MESSAGE_LENGTH);

// Middleware
const corsOptions = {
  origin: CORS_WHITELIST,
};
app.use(cors(corsOptions));

/**
 * This function contacts Google's servers and verifies the captcha response.
 * @param {*} req the request object
 * @returns true or false depending on captcha validity/presence
 */
async function validateCaptcha(c: Context) {
  const body = await c.req.json();
  const RECAPTCHA_SECRET_KEY = c.env.RECAPTCHA_SECRET_KEY;
  if (!RECAPTCHA_SECRET_KEY) {
    throw new Error("Couldn't retrieve RECAPTCHA_SECRET_KEY from environment.");
  }

  if (!body["g-recaptcha-response"]) {
    return false;
  }
  const responseKey = body["g-recaptcha-response"];

  const url = `https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${responseKey}`;
  try {
    const googleResponse = (await (
      await fetch(url, { method: "POST" })
    ).json()) as { success?: boolean };
    return googleResponse?.success;
  } catch (error) {
    return false;
  }
}

// Type representing Slack webhook messages
type SlackMessageObj = {
  blocks: (
    | {
        type: string;
        text: {
          type: string;
          text: string;
          emoji?: undefined;
        };
      }
    | {
        type: string;
        text?: undefined;
      }
    | {
        type: string;
        text: {
          type: string;
          text: string;
          emoji: boolean;
        };
      }
  )[];
};

// Generates a slack webhook message for the spill
function getSlackMessageObject(
  email: string,
  ip: string,
  message: string
): SlackMessageObj {
  return {
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*New spill received!*",
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "plain_text",
          text: message,
          emoji: true,
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*Sender info, keep confidential!*",
        },
      },
      {
        type: "section",
        text: {
          type: "plain_text",
          text: `Email: ${email}`,
          emoji: true,
        },
      },
      {
        type: "section",
        text: {
          type: "plain_text",
          text: `IP Address: ${ip}`,
          emoji: true,
        },
      },
    ],
  };
}

// Sends the slack webhook message to the URL configured
async function sendSlackMessage(c: Context, messageObj: SlackMessageObj) {
  const WEBHOOK_URL = c.env.WEBHOOK_URL;
  if (!WEBHOOK_URL) {
    throw new Error("Couldn't retrieve WEBHOOK_URL from environment.");
  }

  await fetch(WEBHOOK_URL, {
    method: "POST",
    body: JSON.stringify(messageObj),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/*
  This is the endpoint that handles new spills.
*/
app.post("/spill", async (c) => {
  const body = await c.req.json();
  if (!body) {
    c.status(400);
    return c.body("No body attached to request.");
  }

  // Verify captcha
  if (!(await validateCaptcha(c))) {
    c.status(400);
    return c.body(
      'Please complete the captcha (the "I\'m not a robot" checkbox) and try again.'
    );
  }

  // Verify email is @wisc.edu
  let email;
  try {
    email = emailValidator.parse(body["email"].toLowerCase());
  } catch {
    c.status(400);
    return c.body(
      "A wisc.edu email must be specified so that we can respond to your message. Only students with valid wisc.edu email may submit messages."
    );
  }

  let message;
  try {
    message = messageValidator.parse(body["message"]);
  } catch {
    c.status(400);
    return c.body(
      `A message must be included. Messages cannot be longer than ${MAX_MESSAGE_LENGTH} characters.`
    );
  }

  // Get the connection information from the Cloudflare Worker
  const connInfo = getConnInfo(c);
  if (!connInfo.remote.address) {
    c.status(500);
    return c.body(
      `There was an error. Please email ${DEV_EMAIL} to let us know something went wrong. We will fix our server issues, and then you can resubmit your message.`
    );
  }

  // Send spill to Slack
  try {
    await sendSlackMessage(
      c,
      getSlackMessageObject(email, connInfo.remote.address, message)
    );
    c.status(200);
    return c.body("Your spill has been sent successfully!");
  } catch {
    c.status(500);
    return c.body(
      `There was an error. Please email ${DEV_EMAIL} to let us know something went wrong. We will fix our server issues, and then you can resubmit your message.`
    );
  }
});

export default app;
