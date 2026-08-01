import { useEffect, useLayoutEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Bot,
  CheckCircle2,
  Database,
  Lightbulb,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";
import { apiUrl } from "../utils/api";
import "./AdvancedReporting.css";

const initialSuggestions = [
  "چند موتر فعلاً دارم و وضعیت‌شان چیست؟",
  "یک گزارش کامل از عواید، مصارف و سود بده",
  "مشتری‌های بدهکار را برایم تحلیل کن",
  "کدام مسیر بیشترین سفر را داشته است؟",
  "کدام موتر بیشترین سفر و کیلومتر را دارد؟",
  "چند سفر در انتظار، در جریان و تکمیل‌شده دارم؟",
  "بزرگ‌ترین مصارف سیستم کدام‌ها هستند؟",
  "کدام مشتری بیشترین بدهی را دارد؟",
  "وضعیت فعلی کارمندان و دریورها را خلاصه کن",
  "یک گزارش مدیریتی کامل برایم آماده کن",
  "برای بهترشدن سود سیستم چه مواردی را بررسی کنم؟",
  "مهم‌ترین مشکلات فعلی سیستم چیست؟",
];

function MessageContent({ content }) {
  const lines = String(content || "").split("\n").filter((line) => line.trim());

  return (
    <div className="advanced-answer-content">
      {lines.map((line, index) => {
        const cleanLine = line.trim();
        const isBullet = cleanLine.startsWith("•");
        const isNumbered = /^\d+\./.test(cleanLine);
        const isHeading = cleanLine.endsWith(":") && !isBullet;

        if (isBullet || isNumbered) {
          return (
            <div className="advanced-answer-item" key={`${cleanLine}-${index}`}>
              <span>
                {isNumbered
                  ? cleanLine.match(/^\d+/)?.[0]
                  : <CheckCircle2 size={14} />}
              </span>
              <p>{cleanLine.replace(/^(•|\d+\.)\s*/, "")}</p>
            </div>
          );
        }

        if (isHeading) {
          return (
            <h4 key={`${cleanLine}-${index}`}>
              <Lightbulb size={14} />
              {cleanLine}
            </h4>
          );
        }

        return (
          <p className={index === 0 ? "advanced-answer-summary" : ""} key={`${cleanLine}-${index}`}>
            {cleanLine}
          </p>
        );
      })}
    </div>
  );
}

function AssistantMessage({ message }) {
  return (
    <article className="advanced-message assistant-message">
      <div className="advanced-avatar"><Bot size={18} /></div>
      <div className="advanced-bubble">
        <div className="advanced-message-title">
          <strong>تحلیل‌گر سیستم</strong>
          {message.mode && (
            <span>{message.mode === "openai" ? "هوش مصنوعی آنلاین" : "تحلیل داخلی"}</span>
          )}
        </div>
        <MessageContent content={message.content} />
        {message.sources?.length > 0 && (
          <footer>
            <Database size={13} />
            تحلیل بر اساس: {message.sources.join("، ")}
          </footer>
        )}
      </div>
    </article>
  );
}

function AdvancedReporting() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "سلام، من تحلیل‌گر داده‌های سیستم شما هستم. درباره موترها، سفرها، مشتری‌ها، کارمندان، دریورها، مسیرها، عواید، مصارف، سود و بدهی‌ها از من بپرسید.",
      mode: "local",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ mode: "local" });
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const messagesRef = useRef(null);

  useEffect(() => {
    axios
      .get(apiUrl("advanced-report/status"))
      .then((response) => setStatus(response.data))
      .catch(() => setStatus({ mode: "local" }));
  }, []);

  useLayoutEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [loading, messages]);

  async function ask(nextQuestion = question) {
    const cleanQuestion = nextQuestion.trim();
    if (!cleanQuestion || loading) return;

    const userMessage = { role: "user", content: cleanQuestion };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setQuestion("");
    setLoading(true);

    try {
      const history = nextMessages.slice(-8).map(({ role, content }) => ({
        role,
        content,
      }));
      const response = await axios.post(apiUrl("advanced-report/chat"), {
        question: cleanQuestion,
        history,
      });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response.data.answer,
          mode: response.data.mode,
          sources: response.data.sources,
        },
      ]);
      setSuggestions(response.data.suggestions || initialSuggestions);
      setStatus((current) => ({ ...current, mode: response.data.mode }));
    } catch (error) {
      console.error("Advanced reporting failed:", error);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            "در حال حاضر نتوانستم به سرور تحلیل وصل شوم. لطفاً مطمئن شوید بک‌اند سیستم فعال است و دوباره تلاش کنید.",
          mode: "error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetConversation() {
    setMessages([
      {
        role: "assistant",
        content:
          "گفتگو پاک شد. پرسش تازه خود را درباره اطلاعات سیستم بنویسید.",
        mode: status.mode,
      },
    ]);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ask();
    }
  }

  return (
    <div className="advanced-report-page">
      <section className="advanced-report-hero">
        <div>
          <span><Sparkles size={15} /> مرکز هوش تجارتی</span>
          <h1>گزارش‌دهی پیشرفته</h1>
          <p>
            با زبان ساده سؤال کنید؛ سیستم تمام داده‌های عملیاتی را در لحظه
            بررسی کرده و پاسخ مدیریتی می‌دهد.
          </p>
        </div>
        <div className={`advanced-engine-status ${status.mode}`}>
          <i />
          <div>
            <strong>
              {status.mode === "openai" ? "مدل زبانی متصل است" : "موتور تحلیل داخلی فعال است"}
            </strong>
            <span>
              {status.mode === "openai"
                ? status.model || "OpenAI"
                : "بدون نیاز به اینترنت یا کلید API"}
            </span>
          </div>
        </div>
      </section>

      <div className="advanced-workspace">
        <aside className="advanced-prompts">
          <div className="advanced-prompts-title">
            <span><Sparkles size={16} /></span>
            <div><strong>پرسش‌های پیشنهادی</strong><p>برای آغاز روی یک پرسش کلیک کنید</p></div>
          </div>
          <div className="advanced-prompt-list">
            {suggestions.map((item) => (
              <button key={item} onClick={() => ask(item)} disabled={loading}>
                {item}
              </button>
            ))}
          </div>
          <div className="advanced-privacy">
            <Database size={18} />
            <div>
              <strong>دسترسی امن به داده‌ها</strong>
              <p>رمز اکونت‌ها و لوگوی شرکت وارد تحلیل نمی‌شوند.</p>
            </div>
          </div>
        </aside>

        <section className="advanced-chat">
          <header>
            <div><span><Bot size={19} /></span><div><strong>دستیار تحلیل‌گر</strong><p>پاسخ بر اساس آخرین داده‌های سیستم</p></div></div>
            <button onClick={resetConversation} title="پاک‌کردن گفتگو">
              <RotateCcw size={16} /> گفتگوی جدید
            </button>
          </header>

          <div className="advanced-messages" ref={messagesRef}>
            {messages.map((message, index) =>
              message.role === "assistant" ? (
                <AssistantMessage key={`${message.role}-${index}`} message={message} />
              ) : (
                <article className="advanced-message user-message" key={`${message.role}-${index}`}>
                  <div className="advanced-bubble"><p>{message.content}</p></div>
                </article>
              )
            )}
            {loading && (
              <article className="advanced-message assistant-message">
                <div className="advanced-avatar"><Bot size={18} /></div>
                <div className="advanced-bubble advanced-thinking">
                  <span /><span /><span />
                  <p>در حال خواندن و تحلیل داده‌های سیستم...</p>
                </div>
              </article>
            )}
          </div>

          <div className="advanced-composer">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="مثلاً: چقدر موتر فعلاً دارم و کدام موتر بیشتر سفر کرده؟"
              rows="2"
            />
            <button onClick={() => ask()} disabled={loading || !question.trim()}>
              <Send size={18} />
            </button>
            <small>Enter برای ارسال، Shift + Enter برای خط جدید</small>
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdvancedReporting;
