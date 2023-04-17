import {
  createTestAccount,
  createTransport,
  getTestMessageUrl,
} from "nodemailer";
import {
  type Handler,
  type HandlerEvent,
  type HandlerContext,
} from "@netlify/functions";

interface EmailData {
  email: string;
  subject: string;
  message: string;
}

const handler: Handler = async function handler(
  event: HandlerEvent,
  context: HandlerContext
) {
  if (event.body === null) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid input" }),
    };
  }

  const { email, subject, message } = JSON.parse(event.body) as EmailData;
  if (email.length === 0 || subject.length === 0 || message.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid input" }),
    };
  }

  try {
    var testAccount = await createTestAccount();
    console.log("Credentials obtained, sending message...");
  } catch (error) {
    console.error("Error creating test account:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error creating test account" }),
    };
  }

  const transporter = createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  const mailOptions = {
    from: "Nodemailer <example@nodemailer.com>",
    to: email,
    subject,
    text: message,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent:", info.messageId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        info: info.messageId,
        url: info.envelope,
        previewUrl: getTestMessageUrl(info),
      }),
    };
  } catch (error) {
    console.error("Error sending email:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error sending email" }),
    };
  }
};

export { handler };
