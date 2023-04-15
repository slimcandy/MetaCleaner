import React, { useState } from "react";

function App() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  const sendEmail = async () => {
    try {
      setStatus("Sending...");
      const response = await fetch("/.netlify/functions/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, subject, message }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Email sent:", data);
        setStatus("Email sent successfully!");
      } else {
        setStatus("Error sending email.");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      setStatus("Error sending email.");
    }
  };

  return (
    <>
      <input
        className="input"
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
        value={email}
      />
      <input
        className="input"
        placeholder="Subject"
        onChange={(e) => setSubject(e.target.value)}
        value={subject}
      />
      <textarea
        className="input"
        placeholder="Message"
        onChange={(e) => setMessage(e.target.value)}
        value={message}
      />
      <button onClick={sendEmail} className="button">
        Send Email
      </button>
      <div className="status">{status}</div>
    </>
  );
}

export default App;
