import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { notify } from "../utils/notify";
import { confirmAction } from "../utils/confirmDialog";
import { apiUrl } from "../utils/api";
import TablePagination from "../components/TablePagination";
import { useTablePagination } from "../hooks/useTablePagination";
import "./Cars.css";

const API_URL = apiUrl("cars");

function Cars() {
  const navigate = useNavigate();
  const emptyForm = {
    plate: "",
    type: "",
    model: "",
    color: "",
    chassisNo: "",
    seatCount: "",
    status: "",
    note: "",
  };

  const [cars, setCars] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [openAction, setOpenAction] = useState(null);

  async function loadCars() {
    try {
      const res = await axios.get(API_URL);
      setCars(res.data);
    } catch (error) {
      console.error("Error loading cars:", error);
      notify("سرور فعال نیست یا در دریافت معلومات موترها مشکل وجود دارد.", "error");
    }
  }

  useEffect(() => {
    loadCars();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setEditId(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const editCar = (car) => {
    setEditId(car.id);
    setFormData({
      plate: car.plate || "",
      type: car.type || "",
      model: car.model || "",
      color: car.color || "",
      chassisNo: car.chassisNo || car.phone || "",
      seatCount: car.seatCount || "",
      status: car.status || "",
      note: car.note || "",
    });
    setShowModal(true);
    setOpenAction(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editId) {
        await axios.put(`${API_URL}/${editId}`, formData);
      } else {
        await axios.post(API_URL, formData);
      }

      await loadCars();
      resetForm();
      setShowModal(false);
      notify(editId ? "معلومات موتر ویرایش شد." : "موتر جدید ثبت شد.");
    } catch (error) {
      console.error("Error saving car:", error);
      notify("در ذخیره موتر مشکل پیش آمد.", "error");
    }
  };

  const deleteCar = async (carId) => {
    const confirmDelete = await confirmAction({
      title: "Delete Car",
      message: "Are you sure this car should be deleted?",
      confirmText: "Delete",
    });

    if (!confirmDelete) return;

    try {
      await axios.delete(`${API_URL}/${carId}`);
      await loadCars();
      setOpenAction(null);
      notify("موتر حذف شد.");
    } catch (error) {
      console.error("Error deleting car:", error);
      notify("در حذف موتر مشکل پیش آمد.", "error");
    }
  };

  const filteredCars = cars.filter((car) =>
    (car.plate || "").includes(search) ||
    (car.type || "").includes(search) ||
    (car.model || "").includes(search) ||
    (car.color || "").includes(search) ||
    (car.chassisNo || car.phone || "").includes(search)
  );
  const { page, setPage, totalPages, pageItems, pageSize, setPageSize } = useTablePagination(filteredCars, search);

  const activeCars = cars.filter((car) => car.status === "فعال").length;
  const repairCars = cars.filter((car) => car.status === "در ترمیم").length;
  const inactiveCars = cars.filter((car) => car.status === "غیرفعال").length;

  return (
    <div className="cars-page">
      <div className="cars-header">
        <div>
          <h1>مدیریت موترها</h1>
          <p>ثبت، مشاهده و مدیریت تمام موترهای سیستم</p>
        </div>

        <button className="car-add-btn" onClick={openAddModal}>
          + ثبت موتر جدید
        </button>
      </div>

      <div className="cars-stats">
        <div className="cars-stat-card">
          <span>کل موترها</span>
          <strong>{cars.length}</strong>
          <p>تمام موترهای ثبت‌شده</p>
        </div>

        <div className="cars-stat-card">
          <span>موترهای فعال</span>
          <strong>{activeCars}</strong>
          <p>آماده برای سفر</p>
        </div>

        <div className="cars-stat-card">
          <span>در ترمیم</span>
          <strong>{repairCars}</strong>
          <p>نیازمند بررسی</p>
        </div>

        <div className="cars-stat-card">
          <span>غیرفعال</span>
          <strong>{inactiveCars}</strong>
          <p>فعلاً استفاده نمی‌شود</p>
        </div>
      </div>

      <div className="cars-table-card">
        <div className="cars-table-header">
          <div>
            <h3>لیست موترها</h3>
            <p>تمام موترهای ثبت‌شده در سیستم</p>
          </div>

          <input
            placeholder="جستجوی موتر..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="cars-table-wrap">
          <table>
            <thead>
              <tr>
                <th>نمبر پلیت</th>
                <th>نوع موتر</th>
                <th>مودل</th>
                <th>رنگ</th>
                <th>نمبر شاسی</th>
                <th>مقدار چوکی</th>
                <th>وضعیت</th>
                <th>عملیات</th>
              </tr>
            </thead>

            <tbody>
              {pageItems.map((car, index) => (
                <tr key={car.id || index}>
                  <td className="plate">{car.plate}</td>
                  <td>{car.type}</td>
                  <td>{car.model || "-"}</td>
                  <td>{car.color || "-"}</td>
                  <td>{car.chassisNo || car.phone || "-"}</td>
                  <td>{car.seatCount || "-"}</td>
                  <td>
                    <span
                      className={
                        car.status === "فعال"
                          ? "car-badge active"
                          : car.status === "در ترمیم"
                          ? "car-badge repair"
                          : "car-badge inactive"
                      }
                    >
                      {car.status}
                    </span>
                  </td>

                  <td>
                    <div className="action-dropdown">
                      <button
                        className="action-btn"
                        onClick={() =>
                          setOpenAction(openAction === index ? null : index)
                        }
                      >
                        ⋮
                      </button>

                      {openAction === index && (
                        <div className="action-menu">
                          <button type="button" onClick={() => navigate(`/cars/${car.id}`)}>
                            جزئیات
                          </button>
                          <button type="button" onClick={() => editCar(car)}>
                            ایدیت
                          </button>

                          <button
                            type="button"
                            className="danger-action"
                            onClick={() => deleteCar(car.id)}
                          >
                            حذف
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {filteredCars.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "25px" }}>
                    هیچ موتری ثبت نشده است
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination page={page} totalPages={totalPages} setPage={setPage} totalItems={filteredCars.length} pageSize={pageSize} setPageSize={setPageSize} />
      </div>

      {showModal && (
        <div
          className="car-modal-backdrop"
            setShowModal(false);
            resetForm();
          }}
        >
          <div className="car-modal" onClick={(e) => e.stopPropagation()}>
            <div className="car-modal-header">
              <div>
                <h3>{editId ? "ویرایش موتر" : "ثبت موتر جدید"}</h3>
                <p>معلومات موتر را وارد کنید</p>
              </div>

              <button
                className="car-close-btn"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="car-form-grid">
                <div className="form-group">
                  <label>نمبر پلیت</label>
                  <input
                    name="plate"
                    value={formData.plate}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>نوع موتر</label>
                  <input
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>مودل موتر</label>
                  <input
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>رنگ موتر</label>
                  <input
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>نمبر شاسی</label>
                  <input
                    name="chassisNo"
                    value={formData.chassisNo}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>مقدار چوکی</label>
                  <input
                    type="number"
                    min="1"
                    name="seatCount"
                    value={formData.seatCount}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label>وضعیت موتر</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                  >
                    <option value="">انتخاب وضعیت</option>
                    <option value="فعال">فعال</option>
                    <option value="غیرفعال">غیرفعال</option>
                    <option value="در ترمیم">در ترمیم</option>
                  </select>
                </div>

                <div className="form-group form-full">
                  <label>یادداشت</label>
                  <textarea
                    name="note"
                    value={formData.note}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="car-modal-actions">
                <button
                  type="button"
                  className="car-cancel-btn"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                >
                  لغو
                </button>

                <button type="submit" className="car-save-btn">
                  {editId ? "ذخیره تغییرات" : "ثبت موتر"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cars;
