import { useMemo, useState } from "react";
import AfghanDateInput from "../components/AfghanDateInput";
import TablePagination from "../components/TablePagination";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { useTablePagination } from "../hooks/useTablePagination";
import { formatAfghanDate, formatDateTime } from "../utils/afghanDate";
import { getDateRange, toDateValue } from "../utils/financialAnalysis";
import "./Reports.css";

const money = (value) => Number(value || 0).toLocaleString("en-US");
const getDestinationColor = (index) => {
  const hue = Math.round((index * 137.508) % 360);
  return {
    stroke: `hsl(${hue} 78% 34%)`,
    fill: `hsl(${hue} 62% 43%)`,
  };
};

const periodLabels = {
  all: "همه سفرها",
  daily: "روزانه",
  weekly: "هفته‌وار",
  monthly: "ماهانه",
};

function TravelReport() {
  const [travels] = useJsonCollection("travels");
  const [destinations] = useJsonCollection("destinations");
  const latestTravelDate = useMemo(
    () => [...travels].map((travel) => travel.date).filter(Boolean).sort().at(-1) || toDateValue(new Date()),
    [travels]
  );
  const [period, setPeriod] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [search, setSearch] = useState("");
  const activeDate = selectedDate || latestTravelDate;
  const { start, end } = getDateRange(activeDate, period);

  const filteredTravels = travels.filter((travel) =>
    travel.to && (period === "all" || (travel.date && travel.date >= start && travel.date <= end))
  );

  const destinationNames = [...new Set(filteredTravels.map((travel) => travel.to))].filter(Boolean);

  const destinationData = destinationNames.map((name) => {
    const destinationTravels = filteredTravels.filter((travel) => travel.to === name);
    const destination = destinations.find((item) => item.name === name);
    const totalKilometers = destinationTravels.reduce(
      (sum, travel) => sum + Number(travel.kilometers || 0),
      0
    );
    const distanceKilometers = Number(
      destination?.kilometers ||
      destinationTravels.map((travel) => Number(travel.kilometers || 0)).find((value) => value > 0) ||
      0
    );
    return {
      name,
      count: destinationTravels.length,
      totalKilometers,
      distanceKilometers,
      totalFare: destinationTravels.reduce((sum, travel) => sum + Number(travel.fare || 0), 0),
      completed: destinationTravels.filter((travel) => travel.status === "تکمیل شده").length,
      active: destinationTravels.filter((travel) => travel.status === "در جریان").length,
      pending: destinationTravels.filter((travel) => travel.status === "در انتظار").length,
      latestDate: destinationTravels.map((travel) => travel.date).filter(Boolean).sort().at(-1) || "-",
      description: destination?.description || "",
    };
  }).sort((a, b) => b.count - a.count || b.totalKilometers - a.totalKilometers);

  const maxTrips = Math.max(...destinationData.map((destination) => destination.count), 1);
  const destinationStats = destinationData.map((destination, index) => ({
    ...destination,
    color: getDestinationColor(index),
    percentage: Math.max((destination.count / maxTrips) * 100, 4),
  }));

  const totalKilometers = filteredTravels.reduce(
    (sum, travel) => sum + Number(travel.kilometers || 0),
    0
  );
  const filteredDestinations = destinationStats.filter((destination) =>
    destination.name.includes(search) || destination.description.includes(search)
  );
  const { page, setPage, totalPages, pageItems, pageSize, setPageSize } = useTablePagination(filteredDestinations, search);

  return (
    <div className="reports-page">
      <div className="reports-header">
        <h1>راپور سفرها</h1>
        <p>نمایش مسیرها، تعداد سفرها و کیلومتر پیموده‌شده برای هر مقصد</p>
      </div>

      <div className="report-filters">
        <div className="report-filter-group">
          <label>حالت راپور</label>
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="all">همه سفرها</option>
            <option value="daily">روزانه</option>
            <option value="weekly">هفته‌وار</option>
            <option value="monthly">ماهانه</option>
          </select>
        </div>
        <div className="report-filter-group">
          <label>انتخاب تاریخ</label>
          <AfghanDateInput value={activeDate} onChange={setSelectedDate} disabled={period === "all"} />
        </div>
        <div className="report-filter-summary">
          <span>بازه راپور {periodLabels[period]}</span>
          <strong>{period === "all" ? "تمام تاریخ‌های ثبت‌شده" : start === end ? formatAfghanDate(start) : `${formatAfghanDate(start)} تا ${formatAfghanDate(end)}`}</strong>
        </div>
      </div>

      <div className="report-stats">
        <div><span>کل سفرها</span><strong>{filteredTravels.length}</strong><p>سفر در بازه انتخاب‌شده</p></div>
        <div><span>کل مقصدها</span><strong>{destinationStats.length}</strong><p>مقصد دارای سفر</p></div>
        <div><span>مجموع کیلومتر</span><strong>{money(totalKilometers)}</strong><p>کیلومتر پیموده‌شده</p></div>
      </div>

      <div className="route-ranking-card">
        <div className="route-ranking-header">
          <div>
            <span className="route-ranking-kicker">تحلیل مسیرها</span>
            <h3>رتبه‌بندی مقصدهای پرتردد</h3>
            <p>هر ستون باریک یک سفر است؛ مسیرهای پرتردد به‌صورت واضح رتبه‌بندی شده‌اند.</p>
          </div>
          {destinationStats[0] && (
            <div className="top-route-summary">
              <span>پرترددترین مقصد</span>
              <strong>{destinationStats[0].name}</strong>
              <small>{destinationStats[0].count} سفر ثبت‌شده</small>
            </div>
          )}
        </div>
        <div className="route-ranking-list">
          {destinationStats.map((destination, index) => (
            <article className="route-ranking-row" key={destination.name}>
              <div className="route-rank" style={{ background: destination.color.stroke }}>
                <span>رتبه</span><strong>{index + 1}</strong>
              </div>
              <div className="route-main">
                <div className="route-main-title">
                  <div><h4>{destination.name}</h4><p>آخرین سفر: {formatDateTime(destination.latestDate)}</p></div>
                  <strong>{destination.count} <small>سفر</small></strong>
                </div>
                <div className="route-volume-track">
                  <div className="route-volume-fill" style={{ width: `${destination.percentage}%`, background: destination.color.stroke }}>
                    <div className="route-trip-marks">
                      {Array.from({ length: Math.min(destination.count, 12) }, (_, tripIndex) => <i key={tripIndex} />)}
                      {destination.count > 12 && <b>+{destination.count - 12}</b>}
                    </div>
                  </div>
                </div>
                <div className="route-statuses">
                  <span className="done">تکمیل {destination.completed}</span>
                  <span className="active">در جریان {destination.active}</span>
                  <span className="pending">در انتظار {destination.pending}</span>
                </div>
              </div>
              <div className="route-metrics">
                <div><span>فاصله مقصد</span><strong>{money(destination.distanceKilometers)} km</strong></div>
                <div><span>مجموع کیلومتر</span><strong>{money(destination.totalKilometers)} km</strong></div>
                <div><span>مجموع کرایه</span><strong>{money(destination.totalFare)}</strong></div>
              </div>
            </article>
          ))}
          {destinationStats.length === 0 && <div className="report-map-empty">در بازه انتخاب‌شده سفری ثبت نشده است.</div>}
        </div>
      </div>

      <div className="travel-report-table">
        <div className="travel-map-title report-table-title"><div><h3>خلاصه مقصدها</h3><p>فقط مقصدهایی که در بازه انتخاب‌شده سفر دارند</p></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجوی مقصد..." /></div>
        <table>
          <thead><tr><th>رنگ</th><th>مقصد</th><th>تعداد سفر</th><th>فاصله مقصد</th><th>مجموع کیلومتر سفرها</th><th>توضیحات</th></tr></thead>
          <tbody>
            {pageItems.map((destination) => (
              <tr key={destination.name}>
                <td><span className="destination-color" style={{ background: destination.color.stroke }} /></td>
                <td>{destination.name}</td>
                <td>{destination.count}</td>
                <td>{money(destination.distanceKilometers)} کیلومتر</td>
                <td>{money(destination.totalKilometers)} کیلومتر</td>
                <td>{destination.description || "-"}</td>
              </tr>
            ))}
            {destinationStats.length === 0 && <tr><td colSpan="6" className="report-empty">در بازه انتخاب‌شده سفری ثبت نشده است</td></tr>}
          </tbody>
        </table>
        <TablePagination page={page} totalPages={totalPages} setPage={setPage} totalItems={filteredDestinations.length} pageSize={pageSize} setPageSize={setPageSize} />
      </div>
    </div>
  );
}

export default TravelReport;
