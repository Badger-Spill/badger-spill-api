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
const nodemailer = require("nodemailer");

require("dotenv").config();

// Config
const TIME_LOCALE = "en-US";
const TIMEZONE = "America/Chicago";
const CORS_WHITELIST = [
  "https://thebadgerspill.com",
  "https://badger-spill.github.io",
  "http://localhost:4321",
]; // This is the list of domains that forms can be submitted from

// Environment Variables
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const EMAIL_USERNAME = process.env.EMAIL_USERNAME;
const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const PORT = process.env.PORT;
const BEHIND_REVERSE_PROXY =
  process.env.BEHIND_REVERSE_PROXY != undefined &&
  process.env.BEHIND_REVERSE_PROXY.toLowerCase() == "true";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: true,
  requireTLS: true,
  auth: {
    user: EMAIL_USERNAME,
    pass: EMAIL_PASSWORD,
  },
  logger: false, // Do not log information
  debug: false, // Output nothing
});

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
    const googleResponse = await (await fetch(url, { method: "post" })).json();
    return googleResponse.success == true;
  } catch (error) {
    return false;
  }
}

/**
 * This function processes a request object and sends a new spill email.
 * @param {*} req the express request object
 */
async function emailSpill(req) {
  const date = new Date();
  const dateString = date.toLocaleString(TIME_LOCALE, { timeZone: TIMEZONE });

  const mailOptions = {
    from: EMAIL_USERNAME,
    to: "confidentialbounce@gmail.com",
    subject: `New Spill [${dateString}]`,
    text: `Date/time received: ${dateString}
IP Address: ${req.ip}

---- Begin Message ----

${req.body["message"]}

---- End Message ----



**Keep confidential**
Sender email: ${req.body["email"]}
`,
  };

  // Send email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: ", info.messageId);
  } catch (error) {
    console.error("Error sending email: ", error);
  }
}

const app = express();

// Set up CORS headers
const corsOptions = {
  origin: CORS_WHITELIST,
};
app.use(cors(corsOptions));

// Populate body for application/json requests
app.use(express.json());

// Make sure that IP forwarding works correctly if using a reverse proxy
app.set("trust proxy", BEHIND_REVERSE_PROXY);

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
  if (!req.body["email"]) {
    res
      .status(400)
      .send(
        "A wisc.edu email must be specified so that we can respond to your message."
      );
    return;
  }

  if (!req.body["email"].toLowerCase().endsWith("@wisc.edu")) {
    res
      .status(400)
      .send(
        "Badger Spill can only respond to students with valid wisc.edu emails."
      );
    return;
  }

  // Verify that a message is present
  if (!req.body["message"]) {
    res.status(400).send("No message was included.");
    return;
  }

  // Send email
  await emailSpill(req);
  res.status(200).send("Your spill has been sent successfully!");
});

// Start server
const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`Badger Spill API started on port ${PORT}.`);
});
