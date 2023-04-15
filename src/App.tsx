import React, { useId, useState } from "react";

function App() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const emailId = useId();
  const subjectId = useId();
  const messageId = useId();

  async function sendEmail(event: React.FormEvent) {
    event.preventDefault();

    try {
      setStatus("Sending...");
      const response = await fetch("/.netlify/functions/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, message }),
      });

      if (response.ok) {
        const data = await response.json();
        setStatus("Email sent successfully: " + JSON.stringify(data));
        setPreviewUrl(data.previewUrl);
      } else {
        setStatus(
          "Error sending email: " +
            response.statusText +
            " " +
            response.status +
            " " +
            response.body
        );
      }
    } catch (error) {
      setStatus("Error sending email: " + JSON.stringify(error));
    }
  }

  function onEmailChange(event: React.ChangeEvent<HTMLInputElement>) {
    return setEmail(event.target.value);
  }
  function onSubjectChange(event: React.ChangeEvent<HTMLInputElement>) {
    return setSubject(event.target.value);
  }
  function onMessageChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    return setMessage(event.target.value);
  }

  return (
    <>
      <h1>Send an Email</h1>
      <form onSubmit={sendEmail}>
        <dl>
          <dt>
            <label htmlFor={emailId}>Email</label>
          </dt>
          <dd>
            <input
              type="email"
              placeholder="john@example.org"
              onChange={onEmailChange}
              value={email}
              id={emailId}
            />
          </dd>
          <dt>
            <label htmlFor={subjectId}>Subject</label>
          </dt>
          <dd>
            <input
              type="text"
              placeholder="Subject"
              onChange={onSubjectChange}
              value={subject}
              id={subjectId}
            />
          </dd>
          <dt>
            <label htmlFor={messageId}>Message</label>
          </dt>
          <dd>
            <textarea
              placeholder="Message"
              onChange={onMessageChange}
              value={message}
              id={messageId}
            />
          </dd>
        </dl>
        <button type="submit">Send Email</button>
      </form>

      {status.length > 0 && (
        <>
          <hr />

          <h2>Status</h2>
          <samp>{status}</samp>

          <h2>Preview Email</h2>
          {previewUrl.length > 0 && (
            <a href={previewUrl} target="_blank" rel="noreferrer">
              {previewUrl}
            </a>
          )}
        </>
      )}
    </>
  );
}

export default App;
