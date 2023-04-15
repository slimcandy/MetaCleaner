import {
  createTestAccount,
  createTransport,
  getTestMessageUrl,
} from "nodemailer";
import { Handler, APIGatewayEvent, Context } from "aws-lambda";

interface EmailData {
  email: string;
  subject: string;
  message: string;
}

const handler: Handler = async (event: APIGatewayEvent, context: Context) => {
  const { email, subject, message } = JSON.parse(
    event.body || "{}"
  ) as EmailData;

  if (!email || !subject || !message) {
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
    subject: subject,
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
