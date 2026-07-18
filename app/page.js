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
              <label htmlFor="rankName">ยศ - ชื่อ</label>
              <input id="rankName" name="rankName" type="text" maxLength="36" placeholder="เช่น ร.ต. สมชาย" required />
            </div>

            <div className="field">
              <label htmlFor="surname">นามสกุล</label>
              <input id="surname" name="surname" type="text" maxLength="36" placeholder="นามสกุล" required />
            </div>

            <div className="field">
              <label htmlFor="serviceNumber">เลขอัตราข้าราชการ</label>
              <input id="serviceNumber" name="serviceNumber" type="text" inputMode="numeric" maxLength="18" placeholder="เลขอัตราข้าราชการ" required />
            </div>

            <div className="field-grid">
              <div className="field">
                <label htmlFor="ncscNumber">NCSC NO.</label>
                <select id="ncscNumber" name="ncscNumber" required></select>
              </div>
              <div className="field">
                <label htmlFor="bloodGroup">หมู่เลือด</label>
                <select id="bloodGroup" name="bloodGroup" required>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="O">O</option>
                  <option value="AB">AB</option>
                </select>
              </div>
            </div>

            <input id="secretCode" name="secretCode" type="hidden" />

            <div className="actions">
              <button className="primary-button" type="submit">
                <i data-lucide="save"></i>
                <span>บันทึกคำสั่งทำ</span>
              </button>
              <button className="ghost-button" id="resetButton" type="button" title="ล้างฟอร์ม">
                <i data-lucide="rotate-ccw"></i>
              </button>
            </div>
            <p id="statusText" className="status-text" role="status"></p>
          </form>
        </section>

        <section className="preview-zone" aria-label="Dog tag preview">
          <div className="preview-toolbar">
            <div className="segmented" role="tablist" aria-label="Preview side">
              <button type="button" className="segment active" data-side="front">หน้า</button>
              <button type="button" className="segment" data-side="back">หลัง</button>
            </div>
            <button className="icon-button" id="spinButton" type="button" title="หมุนแท็ก">
              <i data-lucide="refresh-cw"></i>
            </button>
          </div>

          <div className="tag-stage" id="tagStage">
            <div className="tag-model" id="tagModel">
              <div className="tag-face tag-front">
                <img src="/assets/images/A.png" alt="Dog tag front" />
              </div>
              <div className="tag-face tag-back">
                <img src="/assets/images/B.png" alt="Dog tag back" />
                <div className="engrave-preview" aria-hidden="true">
                  <strong data-preview="rankName">ยศ ชื่อ</strong>
                  <strong data-preview="surname">นามสกุล</strong>
                  <strong data-preview="serviceNumber">0000000000</strong>
                  <strong data-preview="ncscNumber">NCSC 86 - 01</strong>
                  <strong data-preview="bloodGroup">Blood group: A</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="download-row">
            <button className="ghost-button" id="downloadFront" type="button">
              <i data-lucide="download"></i>
              <span>ด้านหน้า</span>
            </button>
            <button className="ghost-button" id="downloadBack" type="button">
              <i data-lucide="download"></i>
              <span>ด้านหลัง</span>
            </button>
          </div>
        </section>

        <section className="orders-panel" aria-label="Saved orders">
          <div className="panel-title">
            <h2>รายการที่บันทึกแล้ว</h2>
            <div className="secret-lookup">
              <input id="lookupCode" type="text" placeholder="รหัสลับ" />
              <button id="lookupButton" className="icon-button" type="button" title="ดูภาพ">
                <i data-lucide="lock-keyhole"></i>
              </button>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ชื่อ</th>
                  <th>รหัสลับ</th>
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
          <button id="closeDialog" className="icon-button" type="button" title="ปิด">
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
