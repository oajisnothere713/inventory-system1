"use client";

import { useEffect, useRef, useState } from "react";
import { AssistantResponse, answerRegistryQuestion, questionGroupsFromRegistry, useRegistryItems } from "./registryInsights";

type ChatMessage = { role: "user"; text: string } | { role: "ai"; response: AssistantResponse };

export default function AIAssistant() {
  const { items, loading, error } = useRegistryItems();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);
  const questionGroups = questionGroupsFromRegistry(items);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const ask = (question: string) => {
    setInput(question);
    send(question);
  };

  const send = (override?: string) => {
    const question = (override ?? input).trim();
    if (!question || typing) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", text: question }]);
    setTyping(true);
    window.setTimeout(() => {
      setTyping(false);
      setMessages((current) => [...current, { role: "ai", response: answerRegistryQuestion(question, items) }]);
    }, 500);
  };

  return (
    <div className="insights-page">
      <div className="ai-layout">
        <aside className="insights-left-panel">
          <div className="insights-panel-head">
            <div className="insights-panel-title">Ask Item Registry</div>
            <div className="insights-panel-sub">{loading ? "Loading registry..." : `${items.length} registry items available`}</div>
          </div>
          <div className="insights-panel-scroll">
            {questionGroups.map((group) => (
              <div key={group.category}>
                <div className="question-category">{group.category}</div>
                {group.items.map((question) => (
                  <button className="question-item" key={question} onClick={() => ask(question)}>
                    <span className="question-icon">*</span>
                    <span className="question-text">{question}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </aside>

        <main className="chat-panel">
          <div className="insights-chat-messages">
            {!messages.length && !typing ? (
              <div className="chat-empty">
                <div className="chat-empty-icon">*</div>
                <div className="chat-empty-title">Ask anything about your Item Registry</div>
                <div className="chat-empty-sub">
                  {error ? error : "This assistant answers from live registry items, batches, expiry dates, stock minimums, departments, and CAPEX AMC records."}
                </div>
              </div>
            ) : null}

            {messages.map((message, index) =>
              message.role === "user" ? (
                <div className="chat-message user" key={index}>
                  <div className="chat-avatar user">RK</div>
                  <div className="chat-bubble">{message.text}</div>
                </div>
              ) : (
                <AssistantMessage response={message.response} key={index} />
              )
            )}

            {typing ? (
              <div className="chat-message ai">
                <div className="chat-avatar ai">*</div>
                <div className="typing"><span /><span /><span /></div>
              </div>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="chat-input-bar">
            <div className="chat-input-wrap">
              <textarea
                className="chat-input"
                placeholder="Ask about registry items, e.g. which batches expired or what should I reorder?"
                value={input}
                rows={1}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
              />
              <button className="send-btn" disabled={!input.trim() || typing || loading} onClick={() => send()}>^</button>
            </div>
            <div className="chat-hint">Answers are calculated from Item Registry data currently loaded in this app.</div>
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button className="insights-btn" onClick={() => setMessages([])}>Clear chat</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function AssistantMessage({ response }: { response: AssistantResponse }) {
  return (
    <div className="chat-message ai">
      <div className="chat-avatar ai">*</div>
      <div className="chat-bubble">
        {response.intro ? <div style={{ marginBottom: 8 }}>{response.intro}</div> : null}
        {response.text ? <div style={{ color: "var(--ins-mid)" }}>{response.text}</div> : null}
        {response.table ? (
          <div style={{ overflowX: "auto" }}>
            <table className="ai-table">
              <thead><tr>{response.table.heads.map((head) => <th key={head}>{head}</th>)}</tr></thead>
              <tbody>
                {response.table.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex}>{typeof cell === "string" ? cell : <span className={`insights-pill ${cell.c}`}>{cell.t}</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        {response.caveat ? <div style={{ color: "var(--ins-mute)", fontSize: 10.5, fontStyle: "italic", marginTop: 6 }}>{response.caveat}</div> : null}
      </div>
    </div>
  );
}
