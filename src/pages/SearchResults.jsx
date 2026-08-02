import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { buildSystemSearchResults, money } from "../utils/systemSearch";

const groupByType = (rows) => {
  const groups = new Map();
  rows.forEach((row) => {
    const items = groups.get(row.type) || [];
    groups.set(row.type, [...items, row]);
  });
  return Array.from(groups.entries()).map(([type, items]) => ({ type, items }));
};

const escapeRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const Highlight = ({ text, query }) => {
  const value = String(text ?? "-");
  const keyword = String(query || "").trim();
  if (!keyword) return value;

  const pattern = new RegExp(`(${escapeRegExp(keyword)})`, "ig");
  const parts = value.split(pattern);

  return parts.map((part, index) =>
    part.toLowerCase() === keyword.toLowerCase() ? (
      <mark className="search-result-highlight" key={`${part}-${index}`}>
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
};

export default function SearchResults() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const selectedPath = params.get("open") || "";

  const [assets] = useJsonCollection("assets");
  const [customers] = useJsonCollection("customers");
  const [suppliers] = useJsonCollection("suppliers");
  const [supplierPurchases] = useJsonCollection("supplierPurchases");
  const [towerAssets] = useJsonCollection("towerAssets");
  const [deviceTransfers] = useJsonCollection("deviceTransfers");
  const [assetMovements] = useJsonCollection("assetMovements");
  const [towerAssetTransfers] = useJsonCollection("towerAssetTransfers");
  const [deviceHistory] = useJsonCollection("deviceHistory");
  const [securityDeposits] = useJsonCollection("securityDeposits");
  const [customerDevices] = useJsonCollection("customerDevices");
  const [customerPayments] = useJsonCollection("customerPayments");
  const [transactions] = useJsonCollection("transactions");
  const [packages] = useJsonCollection("packages");
  const [customerPackages] = useJsonCollection("customerPackages");
  const [disconnections] = useJsonCollection("disconnections");

  const results = useMemo(
    () =>
      buildSystemSearchResults(
        {
          assets,
          customers,
          suppliers,
          supplierPurchases,
          towerAssets,
          deviceTransfers,
          assetMovements,
          towerAssetTransfers,
          deviceHistory,
          securityDeposits,
          customerDevices,
          customerPayments,
          transactions,
          packages,
          customerPackages,
          disconnections,
        },
        query
      ),
    [
      assetMovements,
      assets,
      customerDevices,
      customerPackages,
      customerPayments,
      customers,
      deviceHistory,
      deviceTransfers,
      disconnections,
      packages,
      query,
      securityDeposits,
      supplierPurchases,
      suppliers,
      towerAssetTransfers,
      towerAssets,
      transactions,
    ]
  );

  const groups = groupByType(results);
  const totalDeposit = results.reduce(
    (sum, item) => sum + Number(item.record?.depositAmount || item.record?.depositReceivedAmount || 0),
    0
  );
  const totalWithdraw = results.reduce(
    (sum, item) =>
      sum +
      Number(
        item.record?.refundAmount ||
          item.record?.withdrawAmount ||
          item.record?.depositRefundAmount ||
          0
      ),
    0
  );

  const handleSearch = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextQuery = String(formData.get("q") || "").trim();
    if (nextQuery) {
      setParams({ q: nextQuery });
    }
  };

  return (
    <div className="search-results-page">
      <section className="search-results-hero">
        <button type="button" onClick={() => navigate(-1)} className="search-results-back">
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="search-results-heading">
          <span>Result</span>
          <h1>Search Results</h1>
          <p>
            Showing every system record that matched{" "}
            <b>{query ? `"${query}"` : "your search"}</b>, including dates,
            issued from, issued to, status, deposit, and withdraw values.
          </p>
        </div>
        <form onSubmit={handleSearch} className="search-results-form">
          <Search size={17} />
          <input name="q" defaultValue={query} placeholder="Search any system data..." />
          <button type="submit">Search</button>
        </form>
      </section>

      <section className="search-results-stats">
        <div><span>Matches</span><strong>{money(results.length)}</strong></div>
        <div><span>Sections</span><strong>{money(groups.length)}</strong></div>
        <div><span>Matched Deposit</span><strong>{money(totalDeposit)}</strong></div>
        <div><span>Matched Withdraw</span><strong>{money(totalWithdraw)}</strong></div>
      </section>

      {groups.map((group) => (
        <section className="search-results-card" key={group.type}>
          <div className="search-results-card-title">
            <div>
              <h2>{group.type}</h2>
              <p>{group.items.length} matched record(s)</p>
            </div>
          </div>
          <div className="search-results-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Record</th>
                  <th>Details</th>
                  <th>Deposit</th>
                  <th>Withdraw</th>
                  <th>Status</th>
                  <th>Open</th>
                </tr>
              </thead>
              <tbody>
                {group.items.map((item, index) => (
                  <tr
                    key={`${group.type}-${index}-${item.title}`}
                    className={selectedPath && item.path === selectedPath ? "search-result-selected" : ""}
                  >
                    <td><span className="search-result-type">{item.type}</span></td>
                    <td data-label="Record">
                      <strong>
                        <Highlight text={item.title} query={query} />
                      </strong>
                      <small>
                        <Highlight text={item.subtitle} query={query} />
                      </small>
                    </td>
                    <td data-label="Details">
                      <div className="search-result-detail-list">
                        {item.details.map((detail) => (
                          <span key={detail}>
                            <Highlight text={detail} query={query} />
                          </span>
                        ))}
                      </div>
                    </td>
                    <td data-label="Deposit">
                      <b className="search-money deposit">
                        <Highlight
                          text={`${money(item.record?.depositAmount || item.record?.depositReceivedAmount || 0)} ${item.record?.depositCurrency || "AFN"}`}
                          query={query}
                        />
                      </b>
                    </td>
                    <td data-label="Withdraw">
                      <b className="search-money withdraw">
                        <Highlight
                          text={`${money(item.record?.refundAmount || item.record?.withdrawAmount || item.record?.depositRefundAmount || 0)} ${item.record?.refundCurrency || item.record?.depositCurrency || "AFN"}`}
                          query={query}
                        />
                      </b>
                    </td>
                    <td data-label="Status">
                      <Highlight
                        text={item.record?.newStatus || item.record?.status || item.record?.issueStatus || item.record?.approvalStatus || "-"}
                        query={query}
                      />
                    </td>
                    <td data-label="Open">
                      <button type="button" onClick={() => navigate(item.path)}>
                        Open
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      {query.trim().length >= 2 && results.length === 0 && (
        <section className="search-results-empty">
          No result matched this search.
        </section>
      )}
    </div>
  );
}
