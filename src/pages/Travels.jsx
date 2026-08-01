import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AfghanDateInput from "../components/AfghanDateInput";
import { useJsonCollection } from "../hooks/useJsonCollection";
import { formatAfghanDate, formatDateTime, todayDateValue } from "../utils/afghanDate";
import { notify } from "../utils/notify";
import { confirmAction } from "../utils/confirmDialog";
import "./Travels.css";

const today = todayDateValue;

const emptyTravel = {
  name: "",
  date: today(),
  driver: "",
  car: "",
  from: "",
  to: "",
  kilometers: "",
  fuelPerKm: "",
  duration: "",
  fare: "",
  status: "در انتظار",
  note: "",
};

const getTravelBadge = (status) => (
  status === "تکمیل شده" ? "travel-badge done" :
    status === "در جریان" ? "travel-badge active" : "travel-badge pending"
);

function Travels() {
  const navigate = useNavigate();
  const [carsList] = useJsonCollection("cars");
  const [driversList] = useJsonCollection("drivers");
  const [travels, setTravels] = useJsonCollection("travels");
  const [destinations, setDestinations] = useJsonCollection("destinations");
  const [customerTravels, setCustomerTravels] = useJsonCollection("customerTravels");
  const [travelExpenses, setTravelExpenses] = useJsonCollection("travelExpenses");
  const [carRepairs, setCarRepairs] = useJsonCollection("carRepairs");
  const [transactions, setTransactions] = useJsonCollection("transactions");
  const availableDrivers = driversList.filter((employee) =>
    employee.status !== "غیرفعال" &&
    (["دریور", "راننده"].includes(employee.jobType) || (!employee.jobType && employee.licenseNo))
  );

  const [search, setSearch] = useState("");
  const [showTravelModal, setShowTravelModal] = useState(false);
  const [showDestinationModal, setShowDestinationModal] = useState(false);
  const [editTravelIndex, setEditTravelIndex] = useState(null);
  const [editDestinationKey, setEditDestinationKey] = useState(null);
  const [travelForm, setTravelForm] = useState(emptyTravel);
  const [destinationForm, setDestinationForm] = useState({
    name: "",
    kilometers: "",
    description: "",
  });

  const destinationGroups = [...new Set([
    ...destinations.map((destination) => destination.name),
    ...travels.map((travel) => travel.to),
  ].filter(Boolean))]
    .map((name) => {
      const destination = destinations.find((item) => item.name === name);
      const destinationTravels = travels
        .map((travel, originalIndex) => ({ ...travel, originalIndex }))
        .filter((travel) => travel.to === name)
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      const travelKilometers = destinationTravels
        .map((travel) => Number(travel.kilometers || 0))
        .find((kilometers) => kilometers > 0);
      return {
        id: destination?.id,
        key: destination?.id ?? `legacy-${name}`,
        name,
        description: destination?.description || "",
        kilometers: Number(destination?.kilometers || travelKilometers || 0),
        travels: destinationTravels,
      };
    })
    .filter((destination) =>
      destination.name.includes(search) ||
      destination.description.includes(search) ||
      destination.travels.some((travel) =>
        (travel.name || "").includes(search) ||
        (travel.date || "").includes(search) ||
        (travel.driver || "").includes(search) ||
        (travel.car || "").includes(search)
      )
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const activeTravels = travels.filter((travel) => travel.status === "در جریان").length;
  const completedTravels = travels.filter((travel) => travel.status === "تکمیل شده").length;

  const closeTravelModal = () => {
    setShowTravelModal(false);
    setEditTravelIndex(null);
    setTravelForm(emptyTravel);
  };

  const closeDestinationModal = () => {
    setShowDestinationModal(false);
    setEditDestinationKey(null);
    setDestinationForm({ name: "", kilometers: "", description: "" });
  };

  const openNewDestination = () => {
    setDestinationForm({ name: "", kilometers: "", description: "" });
    setEditDestinationKey(null);
    setShowDestinationModal(true);
  };

  const openEditDestination = (destination) => {
    setDestinationForm({
      name: destination.name,
      kilometers: destination.kilometers || "",
      description: destination.description || "",
    });
    setEditDestinationKey(destination.key);
    setShowDestinationModal(true);
  };

  const openNewTravel = (destination) => {
    setTravelForm({
      ...emptyTravel,
      name: `سفر به ${destination.name}`,
      to: destination.name,
      kilometers: destination.kilometers || "",
    });
    setEditTravelIndex(null);
    setShowTravelModal(true);
  };

  const openEditTravel = (travel) => {
    setTravelForm({ ...emptyTravel, ...travel });
    setEditTravelIndex(travel.originalIndex);
    setShowTravelModal(true);
  };

  const saveDestination = (event) => {
    event.preventDefault();
    const name = destinationForm.name.trim();
    const kilometers = Number(destinationForm.kilometers || 0);
    const description = destinationForm.description.trim();
    const originalGroup = destinationGroups.find((destination) => destination.key === editDestinationKey);
    const duplicate = destinationGroups.some(
      (destination) => destination.key !== editDestinationKey && destination.name === name
    );

    if (duplicate) {
      notify("این مقصد قبلاً ثبت شده است.", "error");
      return;
    }

    if (originalGroup) {
      const existingDestination = destinations.find((destination) => destination.name === originalGroup.name);
      if (existingDestination) {
        setDestinations(destinations.map((destination) =>
          destination.name === originalGroup.name
            ? { ...destination, name, kilometers, description }
            : destination
        ));
      } else {
        setDestinations([...destinations, { id: `destination-${name}`, name, kilometers, description }]);
      }
      setTravels(travels.map((travel) =>
        travel.to === originalGroup.name ? { ...travel, to: name, kilometers } : travel
      ));
      notify("مقصد و سفرهای مربوط آن ویرایش شد.");
    } else {
      setDestinations([...destinations, { id: `destination-${name}`, name, kilometers, description }]);
      notify("مقصد جدید ثبت شد.");
    }

    closeDestinationModal();
  };

  const deleteDestination = async (destination) => {
    if (destination.travels.length > 0) {
      notify("این مقصد سفر ثبت‌شده دارد. ابتدا سفرهای آن را حذف کنید.", "error");
      return;
    }
    const ok = await confirmAction({
      title: "Delete Destination",
      message: `Delete destination "${destination.name}"?`,
      confirmText: "Delete",
    });
    if (!ok) return;
    setDestinations(destinations.filter((item) => item.name !== destination.name));
    notify("مقصد حذف شد.");
  };

  const saveTravel = (event) => {
    event.preventDefault();
    const normalizedTravel = {
      ...travelForm,
      kilometers: String(travelForm.kilometers || ""),
      ...(editTravelIndex !== null ? { updatedAt: new Date().toISOString() } : { createdAt: new Date().toISOString() }),
    };

    if (editTravelIndex !== null) {
      setTravels(travels.map((travel, index) => index === editTravelIndex ? normalizedTravel : travel));
      notify("معلومات سفر ویرایش شد.");
    } else {
      setTravels([...travels, normalizedTravel]);
      notify("سفر جدید برای مقصد ثبت شد.");
    }

    closeTravelModal();
  };

  const deleteTravel = async (travelIndex) => {
    const ok = await confirmAction({
      title: "Delete Travel",
      message: "Delete this travel? Related customer and expense records will also be removed.",
      confirmText: "Delete",
    });
    if (!ok) return;

    const indexMap = new Map();
    const remainingTravels = [];
    travels.forEach((travel, index) => {
      if (index !== travelIndex) {
        indexMap.set(index, remainingTravels.length);
        remainingTravels.push(travel);
      }
    });
    const remap = (items) => items
      .filter((item) => Number(item.travelIndex) !== travelIndex)
      .map((item) => item.travelIndex === undefined
        ? item
        : { ...item, travelIndex: indexMap.get(Number(item.travelIndex)) });
    const removedCustomerTravelIds = new Set(
      customerTravels
        .filter((item) => Number(item.travelIndex) === travelIndex)
        .map((item) => Number(item.id))
    );
    const removedExpenseIds = new Set(
      travelExpenses
        .filter((item) => Number(item.travelIndex) === travelIndex)
        .map((item) => Number(item.id))
    );

    setTravels(remainingTravels);
    setCustomerTravels(remap(customerTravels));
    setTravelExpenses(remap(travelExpenses));
    setCarRepairs(remap(carRepairs));
    setTransactions(transactions
      .filter((transaction) =>
        Number(transaction.travelIndex) !== travelIndex &&
        !(transaction.source === "customer-travel" && removedCustomerTravelIds.has(Number(transaction.referenceId))) &&
        !(transaction.source === "travel-expense" && removedExpenseIds.has(Number(transaction.referenceId)))
      )
      .map((transaction) => transaction.travelIndex === undefined
        ? transaction
        : { ...transaction, travelIndex: indexMap.get(Number(transaction.travelIndex)) })
    );
    notify("سفر و رکوردهای وابسته حذف شدند.");
  };

  return (
    <div className="travels-page">
      <div className="travels-header">
        <div>
          <h1>مدیریت مقصدها و سفرها</h1>
          <p>هر مقصد را ثبت کنید و سفرهای مربوط به آن را در یک محل مدیریت کنید</p>
        </div>
        <button className="travel-add-btn destination-add-btn" onClick={openNewDestination}>
          + ثبت مقصد جدید
        </button>
      </div>

      <div className="travels-stats">
        <div className="travel-stat-card"><span>کل مقصدها</span><strong>{destinationGroups.length}</strong><p>مقصد ثبت‌شده</p></div>
        <div className="travel-stat-card"><span>کل سفرها</span><strong>{travels.length}</strong><p>تمام سفرهای مقصدها</p></div>
        <div className="travel-stat-card"><span>در جریان</span><strong>{activeTravels}</strong><p>سفر فعال</p></div>
        <div className="travel-stat-card"><span>تکمیل شده</span><strong>{completedTravels}</strong><p>سفر انجام‌شده</p></div>
      </div>

      <div className="destination-hub">
        <div className="travels-table-header">
          <div>
            <h3>مقصدها</h3>
            <p>تعداد سفر، تاریخ‌ها و عملیات هر مقصد</p>
          </div>
          <input
            placeholder="جستجوی مقصد، تاریخ یا سفر..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="destination-hub-list">
          {destinationGroups.map((destination) => {
            const isExpanded = false;
            return (
              <section className="destination-hub-card" key={destination.key}>
                <div className="destination-hub-main">
                  <button
                    type="button"
                    className="destination-expand"
                    onClick={() => navigate(`/destinations/${encodeURIComponent(destination.name)}`)}
                    aria-label="نمایش جزئیات مقصد"
                  >
                    +
                  </button>
                  <div className="destination-hub-info">
                    <h3>{destination.name}</h3>
                    <p>{destination.description || "بدون توضیحات"}</p>
                  </div>
                  <div className="destination-hub-metric">
                    <span>فاصله مقصد</span>
                    <strong>{destination.kilometers || 0} km</strong>
                  </div>
                  <div className="destination-hub-metric">
                    <span>تعداد سفرها</span>
                    <strong>{destination.travels.length}</strong>
                  </div>
                  <div className="destination-dates">
                    <span>تاریخ‌های سفر</span>
                    <div>
                      {destination.travels.slice(0, 4).map((travel) => (
                        <small key={`${travel.originalIndex}-${travel.date}`}>{formatDateTime(travel.date, travel.createdAt || travel.updatedAt)}</small>
                      ))}
                      {destination.travels.length > 4 && <small>+{destination.travels.length - 4}</small>}
                      {destination.travels.length === 0 && <small>هنوز سفر ندارد</small>}
                    </div>
                  </div>
                  <div className="destination-hub-actions">
                    <button type="button" className="destination-trip-add" onClick={() => openNewTravel(destination)}>+ ثبت سفر</button>
                    <button type="button" onClick={() => openEditDestination(destination)}>ویرایش</button>
                    <button type="button" className="destination-delete" onClick={() => deleteDestination(destination)}>حذف</button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="destination-trips">
                    <table>
                      <thead>
                        <tr><th>تاریخ</th><th>نام سفر</th><th>راننده</th><th>موتر</th><th>کیلومتر</th><th>کرایه</th><th>وضعیت</th><th>عملیات</th></tr>
                      </thead>
                      <tbody>
                        {destination.travels.map((travel) => (
                          <tr key={travel.originalIndex}>
                            <td>{formatDateTime(travel.date, travel.createdAt || travel.updatedAt)}</td>
                            <td>{travel.name || "-"}</td>
                            <td>{travel.driver || "-"}</td>
                            <td>{travel.car || "-"}</td>
                            <td>{travel.kilometers || destination.kilometers || "-"}</td>
                            <td>{travel.fare || 0}</td>
                            <td><span className={getTravelBadge(travel.status)}>{travel.status || "نامعلوم"}</span></td>
                            <td>
                              <div className="destination-trip-actions">
                                <button type="button" onClick={() => navigate(`/travels/${travel.originalIndex}`)}>جزئیات</button>
                                <button type="button" onClick={() => openEditTravel(travel)}>ویرایش</button>
                                <button type="button" className="danger-action" onClick={() => deleteTravel(travel.originalIndex)}>حذف</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {destination.travels.length === 0 && <tr><td colSpan="8" className="destination-no-trips">هنوز سفری برای این مقصد ثبت نشده است.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            );
          })}
          {destinationGroups.length === 0 && <div className="destination-hub-empty">هنوز مقصدی ثبت نشده است.</div>}
        </div>
      </div>

      {showDestinationModal && (
        <div className="travel-modal-backdrop">
          <div className="travel-modal destination-modal" onClick={(event) => event.stopPropagation()}>
            <div className="travel-modal-header">
              <div><h3>{editDestinationKey ? "ویرایش مقصد" : "ثبت مقصد جدید"}</h3><p>مقصد و فاصله آن از مبدأ را وارد کنید</p></div>
              <button className="travel-close-btn" onClick={closeDestinationModal}>×</button>
            </div>
            <form onSubmit={saveDestination}>
              <div className="travel-form-grid">
                <div className="form-group">
                  <label>نام مقصد</label>
                  <input value={destinationForm.name} onChange={(event) => setDestinationForm({ ...destinationForm, name: event.target.value })} />
                </div>
                <div className="form-group">
                  <label>فاصله تا مقصد به کیلومتر</label>
                  <input type="number" min="0" value={destinationForm.kilometers} onChange={(event) => setDestinationForm({ ...destinationForm, kilometers: event.target.value })} />
                </div>
                <div className="form-group form-full">
                  <label>توضیحات اختیاری</label>
                  <textarea value={destinationForm.description} onChange={(event) => setDestinationForm({ ...destinationForm, description: event.target.value })} />
                </div>
              </div>
              <div className="travel-modal-actions">
                <button type="button" className="travel-cancel-btn" onClick={closeDestinationModal}>لغو</button>
                <button type="submit" className="travel-save-btn">{editDestinationKey ? "ذخیره تغییرات" : "ثبت مقصد"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTravelModal && (
        <div className="travel-modal-backdrop">
          <div className="travel-modal" onClick={(event) => event.stopPropagation()}>
            <div className="travel-modal-header">
              <div><h3>{editTravelIndex !== null ? "ویرایش سفر" : `ثبت سفر برای ${travelForm.to}`}</h3><p>معلومات این نوبت سفر را وارد کنید</p></div>
              <button className="travel-close-btn" onClick={closeTravelModal}>×</button>
            </div>
            <form onSubmit={saveTravel}>
              <div className="travel-form-grid">
                <div className="form-group"><label>نام سفر</label><input name="name" value={travelForm.name} onChange={(event) => setTravelForm({ ...travelForm, name: event.target.value })} /></div>
                <div className="form-group"><label>تاریخ سفر</label><AfghanDateInput value={travelForm.date} onChange={(date) => setTravelForm({ ...travelForm, date })} /></div>
                <div className="form-group"><label>راننده</label><select value={travelForm.driver} onChange={(event) => setTravelForm({ ...travelForm, driver: event.target.value })}><option value="">انتخاب راننده</option>{availableDrivers.map((driver, index) => <option key={driver.id || index} value={`${driver.firstName} ${driver.lastName}`.trim()}>{driver.firstName} {driver.lastName} - {driver.phone}</option>)}</select></div>
                <div className="form-group"><label>موتر</label><select value={travelForm.car} onChange={(event) => setTravelForm({ ...travelForm, car: event.target.value })}><option value="">انتخاب موتر</option>{carsList.map((car, index) => <option key={index} value={car.plate}>{car.plate} - {car.type} - {car.model}</option>)}</select></div>
                <div className="form-group"><label>مبدأ</label><input value={travelForm.from} onChange={(event) => setTravelForm({ ...travelForm, from: event.target.value })} /></div>
                <div className="form-group"><label>مقصد</label><select value={travelForm.to} onChange={(event) => { const destination = destinationGroups.find((item) => item.name === event.target.value); setTravelForm({ ...travelForm, to: event.target.value, kilometers: destination?.kilometers || travelForm.kilometers }); }}>{destinationGroups.map((destination) => <option key={destination.key} value={destination.name}>{destination.name}</option>)}</select></div>
                <div className="form-group"><label>مدت سفر</label><input value={travelForm.duration} onChange={(event) => setTravelForm({ ...travelForm, duration: event.target.value })} /></div>
                <div className="form-group"><label>مصرف تیل فی کیلومتر</label><input type="number" min="0" step="0.01" value={travelForm.fuelPerKm} onChange={(event) => setTravelForm({ ...travelForm, fuelPerKm: event.target.value })} placeholder="مثلاً 0.12" /></div>
                <div className="form-group"><label>کرایه / مبلغ</label><input type="number" min="0" value={travelForm.fare} onChange={(event) => setTravelForm({ ...travelForm, fare: event.target.value })} /></div>
                <div className="form-group"><label>وضعیت سفر</label><select value={travelForm.status === "تکمیل شده" ? "در جریان" : travelForm.status} onChange={(event) => setTravelForm({ ...travelForm, status: event.target.value })}><option value="در انتظار">در انتظار</option><option value="در جریان">در حال سفر</option></select></div>
                <div className="form-group form-full"><label>توضیحات</label><textarea value={travelForm.note} onChange={(event) => setTravelForm({ ...travelForm, note: event.target.value })} /></div>
              </div>
              <div className="travel-modal-actions">
                <button type="button" className="travel-cancel-btn" onClick={closeTravelModal}>لغو</button>
                <button type="submit" className="travel-save-btn">{editTravelIndex !== null ? "ذخیره تغییرات" : "ثبت سفر"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Travels;
