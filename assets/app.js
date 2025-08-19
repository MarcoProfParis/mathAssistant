// ---- configuration (proxy is hidden from users) ----
const PROXY_URL = "https://math-assistant-proxy.marco-f57.workers.dev";

export function chatApp() {
  return {
    draft: "",
    messages: [],
    status: "ready",
    assistantId: localStorage.getItem("oa_assistant_id") || "asst_nJPlhP6A858ujOQmAB1a7IKZ",
    threadId: localStorage.getItem("oa_thread_id") || null,

    async send() {
      const content = this.draft.trim();
      if (!content) return;

      // push user message
      this.messages.push({ id: Date.now() + "-u", role: "user", html: this.escapeHtml(content) });
      this.draft = "";
      this.scrollDown();

      this.status = "working…";

      try {
        const out = await this.callProxy({
          message: content,
          assistant_id: this.assistantId,
          thread_id: this.threadId,
        });

        if (out.thread_id) {
          this.threadId = out.thread_id;
          localStorage.setItem("oa_thread_id", this.threadId);
        }

        // push assistant reply
        const html = out.output || "(no output)";
        const node = { id: Date.now() + "-a", role: "assistant", html };
        this.messages.push(node);
        this.$nextTick(() => {
          if (window.MathJax && window.MathJax.typesetPromise) {
            MathJax.typesetPromise([this.$refs.messages.lastElementChild]);
          }
          this.scrollDown();
        });

      } catch (err) {
        this.messages.push({
          id: Date.now() + "-err",
          role: "assistant",
          html: `⚠️ ${err.message}`
        });
      } finally {
        this.status = "ready";
      }
    },

    async callProxy({ message, assistant_id, thread_id }) {
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
    },

    resetThread() {
      this.threadId = null;
      localStorage.removeItem("oa_thread_id");
      this.messages = [];
      this.status = "ready";
    },

    escapeHtml(text) {
      const div = document.createElement("div");
      div.innerText = text;
      return div.innerHTML;
    },

    scrollDown() {
      this.$nextTick(() => {
        this.$refs.messages.scrollTop = this.$refs.messages.scrollHeight;
      });
    }
  };
}
