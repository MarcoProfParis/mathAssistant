// ---- configuration (proxy is hidden from users) ----
const PROXY_URL = "https://math-assistant-proxy.marco-f57.workers.dev";

// ---- element refs ----
const els = {
  form: document.getElementById("form"),
  input: document.getElementById("input"),
  send: document.getElementById("send"),
  list: document.getElementById("messages"),
  status: document.getElementById("status"),
  assistantSelect: document.getElementById("assistantSelect"),
  resetThread: document.getElementById("resetThread"),
};

const STORE_KEY_THREAD = "oa_thread_id";
const STORE_KEY_ASSISTANT = "oa_assistant_id";

// Restore last assistant choice
(function initAssistantChoice() {
  const saved = localStorage.getItem(STORE_KEY_ASSISTANT);
  if (saved && [...els.assistantSelect.options].some(o => o.value === saved)) {
    els.assistantSelect.value = saved;
  }
  els.assistantSelect.addEventListener("change", () => {
    localStorage.setItem(STORE_KEY_ASSISTANT, els.assistantSelect.value);
    // optional: reset thread when switching assistants
    resetThread();
  });
})();

function getThreadId() {
  return localStorage.getItem(STORE_KEY_THREAD) || null;
}
function setThreadId(id) {
  if (id) localStorage.setItem(STORE_KEY_THREAD, id);
}
function resetThread() {
  localStorage.removeItem(STORE_KEY_THREAD);
  els.status.textContent = "thread reset";
  els.list.innerHTML = "";
}
els.resetThread.addEventListener("click", resetThread);

function li(role, text) {
  const li = document.createElement("li");
  li.className = `msg ${role}`;
  li.innerHTML = `<div class="bubble">${text}</div>`;
  return li;
}
function setBusy(on) {
  els.send.disabled = on;
  els.input.disabled = on;
  els.status.textContent = on ? "working…" : "ready";
}

async function callProxy({ message, assistant_id, thread_id }) {
  const res = await fetch(PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, assistant_id, thread_id }),
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data.error || res.statusText);
    return data;
  } catch (e) {
    throw new Error(
      `Proxy response was not JSON (${res.status}). Body starts with: ${text.slice(0, 80)}`
    );
  }
}

// submit handler
els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const content = els.input.value.trim();
  if (!content) return;

  const assistantId = els.assistantSelect.value;

  els.list.appendChild(li("user", content));
  els.input.value = "";
  els.list.scrollTop = els.list.scrollHeight;

  setBusy(true);
  try {
    const out = await callProxy({
      message: content,
      assistant_id: assistantId,
      thread_id: getThreadId(),
    });
    if (out.thread_id) setThreadId(out.thread_id);
    els.list.appendChild(li("assistant", out.output || "(no output)"));
  } catch (err) {
    els.list.appendChild(li("assistant", `⚠️ ${err.message}`));
  } finally {
    setBusy(false);
    els.list.scrollTop = els.list.scrollHeight;
  }
});

// Enter to send, Shift+Enter newline
els.input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    els.send.click();
  }
});
