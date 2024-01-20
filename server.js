const process = require("process");
const fs = require("fs");
const express = require("express");
const https = require("https");
const nodemailer = require("nodemailer");

// Config
const TIME_LOCALE = "en-US";
const TIMEZONE = "America/Chicago";

// Environment Variables
const TLS_KEY = fs.readFileSync(process.env.TLS_KEY);
const TLS_CERT = fs.readFileSync(process.env.TLS_CERT);
const TLS_CA = fs.readFileSync(process.env.TLS_CA);
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;
const GMAIL_USERNAME = process.env.GMAIL_USERNAME;
const GMAIL_APP_PASS = process.env.GMAIL_PASS; // This is NOT the Google account password. It is a 16-digit generated passcode.

const credentials = {
  key: TLS_KEY,
  cert: TLS_CERT,
  ca: TLS_CA,
};

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: GMAIL_USERNAME,
    pass: GMAIL_APP_PASS,
  },
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

async function emailSpill(req) {
  const date = new Date();
  const dateString = date.toLocaleString(TIME_LOCALE, { timeZone: TIMEZONE });

  const mailOptions = {
    from: GMAIL_USERNAME,
    to: "recipient_email@example.com", // TODO
    subject: `Spill Received [${dateString}]`,
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
app.post("/spill", (req, res) => {
  // Verify captcha
  if (!validateCaptcha(req)) {
    res
      .status(400)
      .send(
        "Please complete the captcha (the \"I'm not a robot checkbox\") and try again."
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
  }

  // Send email
  emailSpill(req);
});

const server = https.createServer(credentials, app);
server.listen(443, () => {
  console.log("Badger Spill API started.");
});
