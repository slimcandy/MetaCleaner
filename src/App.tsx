/* eslint-disable no-var */
import React, { useId, useState } from "react";

function App(): JSX.Element {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  const emailId = useId();
  const subjectId = useId();
  const messageId = useId();

  async function sendEmail(): Promise<void> {
    try {
      setStatus("Sending...");
      const response = await fetch("/.netlify/functions/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, message }),
      });

      if (response.ok) {
        var data = await response.json();
        setStatus("Email sent successfully: " + JSON.stringify(data));
        setPreviewUrl(data.previewUrl);
      } else {
        setStatus(
          `Error sending email: ${response.statusText} ${
            response.status
          } ${JSON.stringify(data)}`
        );
      }
    } catch (error) {
      setStatus("Error sending email: " + JSON.stringify(error));
    }
  }

  function onFormSubmit(event: React.FormEvent): void {
    event.preventDefault();
    void sendEmail();
  }
  function onEmailChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setEmail(event.target.value);
  }
  function onSubjectChange(event: React.ChangeEvent<HTMLInputElement>): void {
    setSubject(event.target.value);
  }
  function onMessageChange(
    event: React.ChangeEvent<HTMLTextAreaElement>
  ): void {
    setMessage(event.target.value);
  }

  return (
    <>
      <h1>Send an Email</h1>
      <form onSubmit={onFormSubmit}>
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

          {previewUrl.trim().length > 0 && (
            <>
              <h2>Preview Email</h2>
              <a href={previewUrl} target="_blank" rel="noreferrer">
                {previewUrl}
              </a>
            </>
          )}
        </>
      )}
    </>
  );
}

export default App;
