export function About() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2>About Quote Calculator</h2>
        <p className="settings-section-desc">
          A fast, offline-first quoting tool for auto repair shops.
        </p>
      </div>

      <div className="page-card settings-section">
        <h3 className="settings-section-title">Features</h3>
        <ul className="about-feature-list">
          <li>
            <span className="about-feature-title">Quote Builder</span>
            <span className="about-feature-desc">
              Create detailed quotes with customer info, vehicle details, and multiple jobs per quote — each with its own parts list, labor hours, and description.
            </span>
          </li>
          <li>
            <span className="about-feature-title">Auto Calculations</span>
            <span className="about-feature-desc">
              Labor cost is computed automatically from hours and your labor rate. Shop supplies, tax, and grand totals update in real time as you type.
            </span>
          </li>
          <li>
            <span className="about-feature-title">Job Templates</span>
            <span className="about-feature-desc">
              Save any job as a reusable template. Apply templates to new quotes with one click to speed up common services. Templates support flexible category slots that resolve to your actual inventory at apply time.
            </span>
          </li>
          <li>
            <span className="about-feature-title">Parts Inventory</span>
            <span className="about-feature-desc">
              Maintain a personal parts library with part numbers, names, cost, sell price, MSRP, and category. Pick parts directly into any job from inventory.
            </span>
          </li>
          <li>
            <span className="about-feature-title">VIN Decoder</span>
            <span className="about-feature-desc">
              Enter a 17-character VIN on the quote screen to automatically populate the year, make, model, and trim. Decoding is powered by the NHTSA Vehicle API — see below for details.
            </span>
          </li>
          <li>
            <span className="about-feature-title">Make &amp; Model Lookups</span>
            <span className="about-feature-desc">
              When building a quote, selecting a year loads a full list of vehicle makes from NHTSA. Selecting a make then loads the available models for that year, giving you accurate dropdowns without manual typing.
            </span>
          </li>
          <li>
            <span className="about-feature-title">Quote History</span>
            <span className="about-feature-desc">
              All saved quotes are indexed and searchable by customer name, quote number, or vehicle. Reload, update, or delete any past quote at any time.
            </span>
          </li>
          <li>
            <span className="about-feature-title">Print-Ready Quotes</span>
            <span className="about-feature-desc">
              Generate a clean, print-optimized quote sheet that includes your shop's name, logo, address, and phone number.
            </span>
          </li>
          <li>
            <span className="about-feature-title">Business Branding</span>
            <span className="about-feature-desc">
              Set your shop name, contact info, and logo once in Settings — it appears automatically on every printed quote.
            </span>
          </li>
          <li>
            <span className="about-feature-title">Tasks Panel</span>
            <span className="about-feature-desc">
              Track in-progress work orders with a lightweight task list. Add order numbers, labels, and notes to stay organized while you work.
            </span>
          </li>
          <li>
            <span className="about-feature-title">Configurable Rates</span>
            <span className="about-feature-desc">
              Set global defaults for tax rate, labor rate, shop supplies percentage, and shop supplies cap. Rates are saved per quote so historical quotes remain accurate.
            </span>
          </li>
          <li>
            <span className="about-feature-title">Dark &amp; Light Mode</span>
            <span className="about-feature-desc">
              Toggle between dark and light themes. The app respects your system preference on first load.
            </span>
          </li>
        </ul>
      </div>

      <div className="page-card settings-section">
        <h3 className="settings-section-title">VIN Decoder — NHTSA Vehicle API</h3>
        <p className="settings-section-desc">
          Vehicle identification and lookup features are powered by the{" "}
          <strong>NHTSA vPIC (Vehicle Product Information Catalog) API</strong>, a free public service
          maintained by the U.S. National Highway Traffic Safety Administration.
        </p>
        <ul className="about-privacy-list">
          <li>
            <strong>VIN decoding</strong> — submitting a VIN sends it to{" "}
            <code>vpic.nhtsa.dot.gov</code> and returns decoded vehicle attributes including
            year, make, model, trim, body class, engine, drivetrain, and safety features.
          </li>
          <li>
            <strong>Make lookup</strong> — when you select a model year, the app fetches the full
            list of registered vehicle makes from NHTSA for that vehicle type. This list is cached
            for the session so it is only fetched once.
          </li>
          <li>
            <strong>Model lookup</strong> — once a make is selected, the app fetches available
            models for that make and year combination, giving you accurate dropdown options.
          </li>
          <li>
            <strong>No API key required</strong> — the NHTSA vPIC API is publicly accessible
            with no authentication, rate limits, or subscription.
          </li>
          <li>
            <strong>Data is not stored</strong> — decoded VIN results are only used to prefill
            the vehicle form fields. No VIN data is retained beyond the current session.
          </li>
          <li>
            <strong>Offline fallback</strong> — if the NHTSA API is unreachable, the year and
            make fields remain usable as plain text inputs. The Decode VIN button is simply
            disabled until connectivity is restored.
          </li>
        </ul>
        <p className="settings-section-desc about-api-link">
          API documentation:{" "}
          <a
            href="https://vpic.nhtsa.dot.gov/api/"
            target="_blank"
            rel="noopener noreferrer"
          >
            vpic.nhtsa.dot.gov/api
          </a>
        </p>
      </div>

      <div className="page-card settings-section about-privacy-card">
        <h3 className="settings-section-title">Privacy</h3>
        <p className="settings-section-desc">
          Your business data never leaves your device — with one limited exception for VIN lookups.
        </p>
        <ul className="about-privacy-list">
          <li>
            <strong>Local storage only</strong> — all quotes, templates, inventory, tasks, and settings
            are saved in your browser's IndexedDB. Nothing is sent to any server.
          </li>
          <li>
            <strong>VIN lookups contact NHTSA</strong> — when you decode a VIN or load make/model
            lists, the app makes a request to <code>vpic.nhtsa.dot.gov</code>. Only the VIN or
            make/year query is sent — no customer names, prices, or other quote data are included.
          </li>
          <li>
            <strong>No account required</strong> — there is no sign-in, no registration, and no
            user profile of any kind.
          </li>
          <li>
            <strong>No cookies</strong> — the app sets zero cookies. No session tokens, no tracking
            pixels, no analytics.
          </li>
          <li>
            <strong>You own your data</strong> — you can clear everything at any time from the
            Settings page. Closing or clearing your browser storage removes all data permanently.
          </li>
        </ul>
      </div>
    </div>
  );
}
