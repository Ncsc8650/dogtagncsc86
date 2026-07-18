import Script from "next/script";

export default function Page() {
  return (
    <>
      <main className="app-shell">
        <section className="workbench" aria-label="Dog tag order form">
          <div className="brand-lockup">
            <span>NCSC86</span>
            <h1>Dog Tag Order</h1>
          </div>

          <form id="orderForm" className="order-form" autoComplete="off">
            <div className="field">
              <label htmlFor="rankName">First Name</label>
              <input id="rankName" name="rankName" type="text" maxLength="36" placeholder="FIRST NAME" required />
            </div>

            <div className="field">
              <label htmlFor="surname">Last Name</label>
              <input id="surname" name="surname" type="text" maxLength="36" placeholder="LAST NAME" required />
            </div>

            <div className="field">
              <label htmlFor="serviceNumber">Military ID</label>
              <input id="serviceNumber" name="serviceNumber" type="text" inputMode="numeric" maxLength="18" placeholder="MILITARY ID" required />
            </div>

            <div className="field-grid">
              <div className="field">
                <label htmlFor="ncscNumber">NCSC No.</label>
                <select id="ncscNumber" name="ncscNumber" required></select>
              </div>
              <div className="field">
                <label htmlFor="bloodGroup">Blood Group</label>
                <select id="bloodGroup" name="bloodGroup" required>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="O">O</option>
                  <option value="AB">AB</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label htmlFor="quantity">Quantity</label>
              <input id="quantity" name="quantity" type="text" inputMode="numeric" maxLength="3" placeholder="QUANTITY" required />
            </div>

            <input id="secretCode" name="secretCode" type="hidden" />

            <div className="actions">
              <button className="primary-button" type="submit">
                <i data-lucide="save"></i>
                <span>Save Order</span>
              </button>
              <button className="ghost-button" id="resetButton" type="button" title="Reset Form">
                <i data-lucide="rotate-ccw"></i>
              </button>
            </div>
            <p id="statusText" className="status-text" role="status"></p>
          </form>
        </section>

        <section className="preview-zone" aria-label="Dog tag preview">
          <div className="preview-toolbar">
            <div className="segmented" role="tablist" aria-label="Preview side">
              <button type="button" className="segment active" data-side="front">Front</button>
              <button type="button" className="segment" data-side="back">Back</button>
            </div>
            <button className="icon-button" id="spinButton" type="button" title="Spin Tag">
              <i data-lucide="refresh-cw"></i>
            </button>
          </div>

          <div className="tag-stage" id="tagStage">
            <div className="tag-model" id="tagModel">
              <div className="tag-face tag-front">
                <img src="/assets/images/003.png" alt="Dog tag front" />
              </div>
              <div className="tag-face tag-back">
                <img src="/assets/images/B-normalized.png" alt="Dog tag back" />
                <div className="engrave-preview" aria-hidden="true">
                  <strong data-preview="rankName">FIRST NAME</strong>
                  <strong data-preview="surname">LAST NAME</strong>
                  <strong data-preview="serviceNumber">0000000000</strong>
                  <strong data-preview="ncscNumber">NCSC 86 - 01</strong>
                  <strong data-preview="bloodGroup">BLOOD GROUP: A</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="download-row">
            <button className="ghost-button" id="downloadFront" type="button">
              <i data-lucide="download"></i>
              <span>Front Image</span>
            </button>
            <button className="ghost-button" id="downloadBack" type="button">
              <i data-lucide="download"></i>
              <span>Back Image</span>
            </button>
          </div>
        </section>

        <section className="orders-panel" aria-label="Saved orders">
          <div className="panel-title">
            <h2>Saved Orders</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>NCSC No.</th>
                  <th>Qty</th>
                  <th>Images</th>
                </tr>
              </thead>
              <tbody id="ordersBody"></tbody>
            </table>
          </div>
        </section>
      </main>

      <dialog id="imageDialog">
        <div className="dialog-head">
          <strong id="dialogName">Dog Tag</strong>
          <button id="closeDialog" className="icon-button" type="button" title="Close">
            <i data-lucide="x"></i>
          </button>
        </div>
        <div className="dialog-images">
          <a id="dialogFront" download="dogtag-front.png">
            <img alt="Generated dog tag front" />
          </a>
          <a id="dialogBack" download="dogtag-back.png">
            <img alt="Generated dog tag back" />
          </a>
        </div>
      </dialog>

      <canvas id="renderCanvas" hidden></canvas>
      <Script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js" strategy="beforeInteractive" />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
