# OpenAI Token 節省模式規劃（可交付版本）

> 版本：v0.1
> 最後更新：2026-01-24

## 1. 目標與範圍

**目標**：在 token 成本、反應時間與訊息精準度之間取得最佳平衡，並能提交外部 LLM modes 進行可重現的評估比較。

**範圍**：
- 使用 OpenAI Responses API（GPT‑5.1 / 5.2）。
- 以 Copilot Chat（或內部後處理）作為「輸出 HUB」，進行語氣、格式、任務分配等後續處理。
- 定義有限且可控的輸出模式（MODE A–D）。

**不在範圍**：
- 真實成本試算與實測延遲（需實際跑數據後補）。
- 對外部 LLM modes 的法規/合規審查。

## 2. 核心假設與限制

- Copilot Chat 的後處理不計入 OpenAI token 成本。
- GPT‑5.1/5.2 不支援 `service_tier="flex"`，因此不將 Flex 作為節省策略。
- 可接受固定 JSON 結構輸出，且後處理端能做格式、語氣調整。
- 任務類型可被歸入有限的模式範圍。

> 待確認：
> - 目標受眾
> - 任務類型（摘要 / 改寫 / 抽取 / 修復 / 翻譯）
> - 延遲上限（例如 <3s / <10s / 24h）
> - 外部 LLM modes 名稱與數量

## 3. 節省 token 的通用策略

1) **降低推理負擔**
- `reasoning.effort = "none" | "low" | "medium"`
- 低風險任務使用 `none` 或 `low`

2) **限制輸出長度**
- 設定 `max_output_tokens`
- 搭配 `stop` 強制截斷

3) **降低輸出冗長**
- `text.verbosity = "low"`（避免額外解釋）

4) **Prompt Caching**
- 固定前綴提示、使用穩定 schema，提升快取命中率

5) **可延遲任務用 Batch**
- 離線評測與批量任務可用 Batch API（若模型支援）

## 4. 固定輸出契約（穩定性）

**統一格式：JSON（固定欄位）**

```json
{
  "mode": "MODE_A",
  "version": "v1",
  "result": "...",
  "warnings": [],
  "need_input": []
}
```

- 統一欄位順序
- 不允許額外欄位
- 欄位缺失即回 `need_input`

## 5. 標準化 OpenAI 提示模板

**System**
```
你是精簡輸出引擎。
目標：用最少 token 回答，禁止多餘解釋。
只輸出指定格式；資訊不足就回 NEED_INPUT: <缺少欄位>。
```

**User**
```
TASK: <任務>
INPUT: <原文或資料>
CONSTRAINTS:
- 語言: zh-TW
- 格式: JSON
- 欄位: <固定欄位列表>
- 風格: <簡短/正式/技術>
```

## 6. 模式定義（有限類別）

### MODE A｜FAST‑MIN（最低 token / 低延遲）
**用途**：抽取、短答、格式修正
```
model: gpt-5.2
reasoning: { effort: "none" }
text: { verbosity: "low" }
max_output_tokens: 150
```

### MODE B｜BALANCED（一般任務平衡）
**用途**：摘要、改寫、簡短分析
```
model: gpt-5.2
reasoning: { effort: "low" }
text: { verbosity: "medium" }
max_output_tokens: 300
```

### MODE C｜PRECISION‑LITE（精準優先但控 token）
**用途**：高風險文字、關鍵修訂
```
model: gpt-5.2
reasoning: { effort: "medium" }
text: { verbosity: "low" }
max_output_tokens: 350
```

### MODE D｜BATCH‑CHEAP（成本最低 / 可延遲）
**用途**：批量轉換、離線評測集
```
endpoint: /v1/responses
completion_window: "24h"
```

## 7. 輸出 HUB（Copilot Chat / 內部後處理）

**流程**
1) OpenAI 只輸出「嚴格格式、短輸出」
2) HUB 進行：語氣調整、格式擴展、分流
3) HUB 負責拼裝最終交付格式（報告/公告/PR/評估）

**優勢**
- 節省 OpenAI token
- 降低回應時間
- 可集中風格控管

## 8. 路由規則（簡化版）

- 欄位抽取 / 改寫短句 → MODE A
- 一般摘要 / 改寫 → MODE B
- 高風險內容 / 需精準修訂 → MODE C
- 可延遲任務 / 批量評測 → MODE D

> 待確認：依任務類型是否需要更細緻分類（最多 4–6 種）。

## 9. 評估與對外提交

**固定測試集**
- 任務分布固定
- 輸入長度固定
- 評估輸出欄位固定

**指標**
- token 成本
- 反應時間
- 精準度（人工或外部 LLM modes 量化）

**對外提交格式**
- 每個模式對應一份設定檔（JSON/YAML）
- 附加版本號、日期、模型名、參數組合

## 10. 待你確認的事項（可直接回覆）

1) 這份文件的目標受眾？
2) 你要評估的外部 LLM modes 名稱與數量？
3) 任務類型清單與其優先級？
4) 延遲與精準度容忍範圍？
5) 是否需要更嚴格的 JSON schema（如 JSON Schema 檔）？

---

如需我補成最終版：請回覆以上 5 點，我會把模式與路由規則、評估表格、與輸出 HUB 規範定稿。
