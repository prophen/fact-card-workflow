import styled from 'styled-components'

export const GeneratorPage = styled.div`
  --ink: #262722;
  --muted: #66675d;
  --line: #deded2;
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
  padding: 48px max(24px, calc((100% - 1160px) / 2));
  background: #f6f5ef;
  color: var(--ink);
  font-size: 15px;
  line-height: 1.6;
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  .page-header {
    margin-bottom: 36px;
  }
  .eyebrow {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
  }
  h1 {
    font-size: clamp(32px, 4vw, 48px);
    line-height: 1.12;
    letter-spacing: -0.04em;
    margin: 16px 0;
    font-weight: 650;
  }
  h2 {
    font-size: 23px;
    line-height: 1.25;
    letter-spacing: -0.025em;
    margin: 10px 0 12px;
  }
  p {
    margin: 0 0 18px;
  }
  .page-header > p {
    color: var(--muted);
    max-width: 580px;
  }
  .workflow-strip {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 24px;
  }
  .workflow-strip span {
    border: 1px solid var(--line);
    border-radius: 100px;
    padding: 5px 16px;
    font-size: 12px;
    color: var(--muted);
  }
  .workflow-strip .active {
    background: var(--ink);
    border-color: var(--ink);
    color: #f8e2a6;
  }
  .steps {
    display: grid;
    grid-template-columns: 1.1fr 1fr;
    gap: 24px;
    align-items: start;
  }
  .step-panel {
    background: #fffef9;
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 28px;
  }
  .step-panel > p {
    color: var(--muted);
    font-size: 14px;
  }
  label {
    display: block;
    font-size: 13px;
    font-weight: 650;
    margin: 22px 0 8px;
  }
  textarea {
    display: block;
    width: 100%;
    resize: vertical;
    min-height: 112px;
    padding: 14px;
    border: 1px solid #c8c9bb;
    border-radius: 8px;
    font: inherit;
    line-height: 1.5;
    background: white;
    color: var(--ink);
    margin-bottom: 16px;
  }
  textarea::placeholder {
    color: #858679;
  }
  button {
    border: 1px solid var(--ink);
    background: var(--ink);
    color: #fffef9;
    border-radius: 8px;
    padding: 11px 18px;
    font: inherit;
    font-size: 13px;
    font-weight: 650;
    cursor: pointer;
    transition: background 0.15s;
  }
  button:hover:not(:disabled) {
    background: #454738;
  }
  button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
  button:focus-visible,
  textarea:focus-visible,
  a:focus-visible {
    outline: 3px solid #aa791c;
    outline-offset: 3px;
  }
  form button {
    width: 100%;
    background: #eac471;
    color: #25261f;
    border-color: #c8a24f;
  }
  form button:hover:not(:disabled) {
    background: #dfb45b;
  }
  .ideas-list {
    list-style: none;
    padding: 0;
    margin: 24px 0 0;
    display: grid;
    gap: 12px;
  }
  .ideas-list li {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 18px;
    background: white;
  }
  .ideas-list li[data-selected='true'] {
    border-color: #a37a2d;
    background: #fbf4e3;
  }
  .ideas-list p {
    font-size: 14px;
    margin: 0 0 12px;
  }
  .ideas-list button {
    background: transparent;
    color: var(--ink);
    border-color: #c8c9bb;
    padding: 6px 12px;
    font-size: 12px;
  }
  .ideas-list button:hover:not(:disabled) {
    background: #eeeee3;
  }
  [role='status']:empty {
    display: none;
  }
  [role='status'] {
    font-size: 13px;
    color: var(--muted);
    margin-top: 16px;
  }
  .progress {
    padding: 16px 20px;
    background: #eaeedf;
    border-radius: 10px;
  }
  .error-panel {
    margin-top: 18px;
    padding: 20px;
    border: 1px solid #e0b8a7;
    border-radius: 10px;
    background: #fff2eb;
    color: #753e2c;
    overflow-wrap: anywhere;
  }
  .audit-list {
    padding-left: 20px;
    font-size: 13px;
  }
  .audit-list li {
    margin-bottom: 16px;
  }
  .audit-list p {
    margin: 4px 0;
  }
  blockquote {
    margin: 8px 0;
    border-left: 3px solid #c8a24f;
    padding-left: 12px;
  }
  .correction-panel {
    border-top: 1px solid #e0b8a7;
    margin: 20px 0;
    padding-top: 4px;
  }
  details {
    margin: 20px 0;
  }
  summary {
    cursor: pointer;
    font-weight: 600;
  }
  .error-panel p:last-child {
    margin-bottom: 0;
    margin-top: 12px;
  }
  a {
    color: #72541d;
    text-underline-offset: 4px;
    font-weight: 600;
  }
  .result-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 32px;
    padding: 28px;
    margin-top: 28px;
    border: 1px solid var(--line);
    border-radius: 16px;
    background: #fffef9;
  }
  .card-preview img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 8px;
  }
  .card-preview p {
    font-size: 12px;
    color: var(--muted);
    margin-top: 12px;
  }
  .result-copy {
    overflow-wrap: anywhere;
  }
  .result-copy h2 {
    margin-top: 24px;
    font-size: 18px;
  }
  .result-copy h2:first-child {
    margin-top: 0;
  }
  @media (max-width: 800px) {
    padding: 28px 20px;
    .steps,
    .result-panel {
      grid-template-columns: 1fr;
    }
    .step-panel,
    .result-panel {
      padding: 22px;
    }
  }
  .claim-status {
    display: inline-block;
    margin-right: 12px;
    padding: 4px 8px;
    border-radius: 5px;
    text-transform: capitalize;
    font-size: 12px;
    font-weight: 700;
  }
  .claim-status.supported {
    background: #dcfce7;
    color: #166534;
  }
  .claim-status.unsupported {
    background: #fef3c7;
    color: #92400e;
  }
  .claim-status.contradicted {
    background: #fee2e2;
    color: #991b1b;
  }
  .sources-list {
    padding-left: 20px;
  }
  .sources-list li {
    margin-bottom: 20px;
  }
  .sources-list a {
    overflow-wrap: anywhere;
  }
`
